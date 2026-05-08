// =============================================================================
// API ADMIN USERS - Admin Management (Super Admin Only)
// =============================================================================
// POST /api/admin-users { action: "invite", data: { email, prenom, nom, role } }
//   role: 'viewer' | 'editor' | 'super_admin'
//   Creates user with temp password - user must use "Forgot Password" to set their own
// POST /api/admin-users { action: "delete", data: { id } }

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function verifyAdmin(req, supabase) {
  try {
    // Node.js format: req.headers is an object
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    if (!token) return null;

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return null;

    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !admin) return null;
    return admin;
  } catch (error) {
    console.error('verifyAdmin error:', error);
    return null;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // Verify caller is authenticated super admin
    const admin = await verifyAdmin(req, supabase);
    if (!admin) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    if (admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const body = req.body;
    const { action, data } = body;

    if (action !== 'invite' && action !== 'delete') {
      return res.status(400).json({ error: 'Action inconnue' });
    }
    if (!data) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    // Handle delete action
    if (action === 'delete') {
      const adminId = data.id;
      if (!adminId) {
        return res.status(400).json({ error: 'ID administrateur requis' });
      }

      // Prevent self-deletion
      if (admin.id === adminId) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
      }

      // Get admin record to find user_id
      const { data: targetAdmin, error: fetchError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('id', adminId)
        .single();

      if (fetchError || !targetAdmin) {
        return res.status(404).json({ error: 'Administrateur introuvable' });
      }

      // Delete from admins table first
      const { error: deleteAdminError } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (deleteAdminError) {
        console.error('Delete admin error:', deleteAdminError);
        return res.status(400).json({ error: 'Erreur lors de la suppression de l\'administrateur' });
      }

      // Delete from Supabase Auth
      if (targetAdmin.user_id) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetAdmin.user_id);
        if (deleteAuthError) {
          console.error('Delete auth user error:', deleteAuthError);
          // Admin record already deleted, log but don't fail
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Administrateur supprimé'
      });
    }

    // Handle invite action
    const email = data.email?.trim()?.toLowerCase();
    const prenom = data.prenom?.trim();
    const nom = data.nom?.trim();
    const role = data.role || 'viewer';

    // Validate
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    if (email.length > 254) return res.status(400).json({ error: 'Email trop long (max 254 caractères)' });
    if (!prenom) return res.status(400).json({ error: 'Prénom requis' });
    if (prenom.length > 100) return res.status(400).json({ error: 'Prénom trop long (max 100 caractères)' });
    if (!nom) return res.status(400).json({ error: 'Nom requis' });
    if (nom.length > 100) return res.status(400).json({ error: 'Nom trop long (max 100 caractères)' });
    if (!['viewer', 'editor', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    // Check if admin already exists
    const { data: existing } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Un administrateur avec cet email existe déjà' });
    }

    // Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email === email);
    if (existingAuthUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà dans le système d\'authentification' });
    }

    // Generate a random temporary password
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    // Create user with temporary password (confirmed)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { prenom, nom }
    });

    if (authError) {
      console.error('createUser auth error:', authError);
      return res.status(400).json({ error: 'Erreur lors de la création du compte: ' + authError.message });
    }

    if (!authData?.user) {
      return res.status(400).json({ error: 'Erreur lors de la création du compte' });
    }

    // Create admin record with role
    const adminRecord = {
      user_id: authData.user.id,
      email,
      prenom,
      nom,
      role,
      is_active: true
    };

    const { error: insertError } = await supabase.from('admins').insert(adminRecord);

    if (insertError) {
      console.error('inviteAdmin insert error:', insertError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: 'Erreur lors de la création de l\'administrateur' });
    }

    // Send password reset email so the new user can set their password
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.SITE_URL || '').split(',').map(s => s.trim()).filter(Boolean);
    const requestOrigin = req.headers.origin || '';
    const redirectTo = allowedOrigins.includes(requestOrigin) ? requestOrigin : (process.env.SITE_URL || '');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (resetError) {
      console.warn('Password reset email failed:', resetError);
      // Don't fail - admin is created, they can request a reset manually
    }

    return res.status(200).json({
      success: true,
      message: resetError
        ? 'Admin créé - demandez-lui d\'utiliser "Mot de passe oublié" pour définir son mot de passe'
        : 'Admin créé - un email de réinitialisation de mot de passe a été envoyé'
    });

  } catch (error) {
    console.error('API admin-users error:', error);
    return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  }
}
