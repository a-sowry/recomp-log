// Supabase connection (Project Settings → API). Both values are safe to publish:
// row-level security means only your login can read or write your data.
window.RECOMP_CONFIG = {
  SUPABASE_URL: 'https://upbnevpetfbalytrgbuo.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_CQmEqSMsvasroEemet5Tnw_dcXGZvzA',
  // Public half of the notification key pair (the private half lives only in the send-push function's secrets).
  VAPID_PUBLIC_KEY: 'BFLgrTn2aeAbcgBwzd_w2ysBy1J96Mpb9mvMRqWILcAYjkMyRSHv-LKJjnyXTXv5WnxbdzErGX4FAmn96rlowF0',
};
