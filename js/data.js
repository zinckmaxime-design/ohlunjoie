
// add data to site config
async function initSiteConfig() {
  const { data: configs } = await _supabase.from('app_config').select('key').limit(1);
  if (!configs || configs.length === 0) {
    // Insert default config as key-value pairs
    await _supabase.from('app_config').insert([
      { key: 'association_name', value: "Ohlun'Joie" },
      { key: 'intro_text', value: 'Notre association rassemble des bénévoles passionnés...' },
      { key: 'association_description', value: 'Association locale de bénévolat' },
      { key: 'logo_url', value: '' },
      { key: 'logo_emoji', value: '🤝' }
    ]);
  }
}