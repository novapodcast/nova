// Website i18n configuration using the same structure as mobile app
// This ensures consistency across platforms

export const translations = {
  rw: {
    // Navigation & Common
    nav: {
      home: 'Ahabanza',
      episodes: 'Ibice',
      pricing: 'Ibiciro',
      about: 'Abo turi',
      contact: 'Twandikire',
      signIn: 'Injira',
      signOut: 'Sohoka',
      dashboard: 'Ibiro',
      admin: 'Ubuyobozi',
    },
    
    // Home Page
    home: {
      tagline: 'Hindura ibitekerezo mubice, inzozi zibe ukuri',
      subtitle: 'Vugurura podcast zuzuye inkuru ninzobere. Shakisha igice cyawe gikurikira utangire kumva uyu munsi.',
      startListening: 'Tangira Kumva',
      browsePlans: 'Reba Gahunda',
      episodesAvailable: 'Ibice 150K+ Biraboneka',
      featuredEpisodes: 'Ibice Byagarutse',
      viewAll: 'Reba byose',
    },
    
    // Episodes
    episodes: {
      title: 'Ibice',
      loading: 'Birimo gutegurwa...',
      episode: 'Igice',
      untitled: 'Nta zina',
    },
    
    
    pricing: {
    title: 'Ibiciro Byoroshye kandi Bisobanutse',
    subtitle: 'Hitamo gahunda ijyanye n’ibyo ukeneye kuri podcast. Gahunda zose zitanga uburenganzira bwo gukoresha urubuga rwacu.',
    chooseDuration: 'Hitamo igihe',
    oneMonth: 'Ukwezi 1',
    threeMonths: 'Amezi 3',
    sixMonths: 'Amezi 6',
    free: 'Ubuntu',
    perMonth: 'ku kwezi',
    forMonths: 'mu mezi {{count}}',
    save: 'Uzigama {{percent}}%',
    choosePlan: 'Hitamo Gahunda',
    getStarted: 'Tangira',
    needCustom: 'Ukeneye gahunda yihariye?',
    contactUs: 'Twandikire',
    allPricesInRWF: 'Ibiciro byose biri mu mafaranga y’u Rwanda (RWF).',
  },
    
    
    // Auth
    auth: {
      signIn: 'Injira',
      signUp: 'Iyandikishe',
      email: 'Imeyili',
      password: 'Ijambo ry\'ibanga',
      welcomeBack: 'Murakaza neza. Koresha imeyili yawe n\'ijambo ry\'ibanga.',
      createAccount: 'Kora konti',
      joinNova: 'Injira muri Nova. Koresha imeyili yawe n\'ijambo ry\'ibanga.',
      signingIn: 'Birimo kwinjira...',
      signingUp: 'Birimo kwiyandikisha...',
      noAccount: 'Nta konti ufite?',
      createOne: 'Kora imwe',
      haveAccount: 'Ufite konti?',
      signInHere: 'Injira hano',
    },
    
    // Dashboard
    dashboard: {
      title: 'Ibiro',
      welcomeBack: 'Murakaza neza, {{name}}',
      subscription: 'Iyandikishe',
      profile: 'Umwirondoro',
      favorites: 'Ibyakunzwe',
      noActivePlan: 'Nta gahunda ikora',
      browsePlans: 'Reba gahunda',
      status: 'Uko bimeze',
      renews: 'Bizongera',
      changePlan: 'Hindura gahunda',
      notSet: 'Ntibyashyizweho',
      editProfile: 'Hindura umwirondoro',
      browseEpisodes: 'Reba ibice',
      yourFavorites: 'Ibyakunze byawe',
      tip: 'Icyitonderwa',
      dashboardTip: 'Ibiro byawe byerekana amakuru yigihe nyacyo kuva muri Supabase. Iyandikishe kuri gahunda kugirango ufungure ibintu byiza!',
    },
    
    // Admin
    admin: {
      title: 'Ubuyobozi',
      subtitle: 'Genzura platiforme yawe ya Nova. Uburyo bwo kwinjira busaba uburenganzira bwo kuyobora.',
      pricing: 'Ibiciro',
      managePlans: 'Genzura Gahunda',
      updatePricing: 'Vugurura iyandikishe n\'ibiciro',
      analytics: 'Isesengura',
      comingSoon: 'Biza vuba',
      viewMetrics: 'Reba ibipimo bya platiforme',
      content: 'Ibirimo',
      manageEpisodes: 'Genzura ibice na podcast',
      pricingManagement: 'Genzura Ibiciro',
      pricingSubtitle: 'Genzura ibiciro byo kwiyandikisha. Impinduka zigaragara ako kanya kurubuga no kuri porogaramu ya mobile.',
      edit: 'Hindura',
      save: 'Bika',
      cancel: 'Hagarika',
      saving: 'Birimo kubikwa...',
      activate: 'Kora',
      deactivate: 'Hagarika',
      active: 'Birakora',
      inactive: 'Ntibirakora',
      mostPopular: 'Ikunzwe cyane',
      planName: 'Izina rya gahunda',
      price: 'Igiciro',
      savings: 'Kizigama',
      features: 'Ibintu',
      highlighted: 'Byerekana nka "Ikunzwe cyane"',
      note: 'Icyitonderwa',
      pricingNote: 'Impinduka ku biciro zigaragara ako kanya kubakoresha. Porogaramu ya mobile ikura ibiciro muri database, bityo ivugurura rikora kuri platiforme zose.',
    },
    
    // About
    about: {
      title: 'Abo turi Nova',
      description: 'Nova ni urubuga rwa podcast rufasha abahanga mu gukora ibirimo gusangiza inkuru zifite agaciro no gufasha ababumva kubona ibyo bakunda.',
      mission: 'Ku rubuga, tuborohereza kureba ibice (podcasts), gucunga ibyo ukurikira, no gukomeza kumenya ibishya bijyanye n\'ibyo ukunda.',
    },
    
    // Contact
    contact: {
      title: 'Twandikire',
      subtitle: 'Ibibazo cyangwa ubufatanye? Oherereze ubutumwa.',
      name: 'Amazina',
      message: 'Ubutumwa',
      send: 'Ohereza',
    },
    
    // Terms
    terms: {
      title: 'Amabwiriza y\'Ikoreshwa',
      placeholder: 'Aya ni amabwiriza y\'agateganyo. Amabwiriza arambuye azashyirwaho mbere yo gutangira.',
    },
    
    // Privacy
    privacy: {
      title: 'Politiki y\'Ibanga',
      placeholder: 'Politiki y\'ibanga y\'agateganyo. Duha agaciro ibanga ryawe kandi tuzandika neza imikorere mbere yo gutangira.',
    },
    
    // Footer
    footer: {
      terms: 'Amabwiriza',
      privacy: 'Ibanga',
      copyright: '© {{year}} Nova',
    },
    
    // Common
    common: {
      loading: 'Birimo gutegurwa...',
      error: 'Habayeho ikosa',
      success: 'Byagenze neza',
      comingSoon: 'Biza vuba',
      episodes: 'ibice',
      signOut: 'Sohoka',
    },
  },
  
  en: {
    // Navigation & Common
    nav: {
      home: 'Home',
      episodes: 'Episodes',
      pricing: 'Pricing',
      about: 'About',
      contact: 'Contact',
      signIn: 'Sign in',
      signOut: 'Sign out',
      dashboard: 'Dashboard',
      admin: 'Admin',
    },
    
    // Home Page
    home: {
      tagline: 'Shape Ideas into Episodes, Make Dreams Real',
      subtitle: 'Discover inspiring podcasts packed with stories and insights. Find your next favorite episode and start listening today.',
      startListening: 'Start Listening',
      browsePlans: 'Browse Plans',
      episodesAvailable: '150K+ Episodes Available',
      featuredEpisodes: 'Featured Episodes',
      viewAll: 'View all',
    },
    
    // Episodes
    episodes: {
      title: 'Episodes',
      loading: 'Loading...',
      episode: 'Episode',
      untitled: 'Untitled',
    },
    
    // Pricing
    pricing: {
      title: 'Simple, Transparent Pricing',
      subtitle: 'Choose the plan that fits your podcasting needs. All plans include access to our platform.',
      chooseDuration: 'Choose Duration',
      oneMonth: '1 Month',
      threeMonths: '3 Months',
      sixMonths: '6 Months',
      free: 'Free',
      perMonth: 'per month',
      forMonths: 'for {{count}} months',
      save: 'Save {{percent}}%',
      choosePlan: 'Choose Plan',
      getStarted: 'Get Started',
      needCustom: 'Need a custom plan?',
      contactUs: 'Contact us',
      allPricesInRWF: 'All prices in Rwandan Francs (RWF).',
    },
    
    // Auth
    auth: {
      signIn: 'Sign in',
      signUp: 'Sign up',
      email: 'Email',
      password: 'Password',
      welcomeBack: 'Welcome back. Use your email and password.',
      createAccount: 'Create account',
      joinNova: 'Join Nova. Use your email and password.',
      signingIn: 'Signing in...',
      signingUp: 'Signing up...',
      noAccount: 'No account?',
      createOne: 'Create one',
      haveAccount: 'Have an account?',
      signInHere: 'Sign in here',
    },
    
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcomeBack: 'Welcome back, {{name}}',
      subscription: 'Subscription',
      profile: 'Profile',
      favorites: 'Favorites',
      noActivePlan: 'No active plan',
      browsePlans: 'Browse plans',
      status: 'Status',
      renews: 'Renews',
      changePlan: 'Change plan',
      notSet: 'Not set',
      editProfile: 'Edit profile',
      browseEpisodes: 'Browse episodes',
      yourFavorites: 'Your Favorites',
      tip: 'Tip',
      dashboardTip: 'Your dashboard shows real-time data from Supabase. Subscribe to a plan to unlock premium features!',
    },
    
    // Admin
    admin: {
      title: 'Admin Dashboard',
      subtitle: 'Manage your Nova platform. Access requires admin privileges.',
      pricing: 'Pricing',
      managePlans: 'Manage Plans',
      updatePricing: 'Update subscription tiers and pricing',
      analytics: 'Analytics',
      comingSoon: 'Coming Soon',
      viewMetrics: 'View platform metrics',
      content: 'Content',
      manageEpisodes: 'Manage episodes and podcasts',
      pricingManagement: 'Pricing Management',
      pricingSubtitle: 'Manage subscription pricing. Changes are reflected immediately on the website and mobile app.',
      edit: 'Edit',
      save: 'Save Changes',
      cancel: 'Cancel',
      saving: 'Saving...',
      activate: 'Activate',
      deactivate: 'Deactivate',
      active: 'Active',
      inactive: 'Inactive',
      mostPopular: 'Most Popular',
      planName: 'Plan Name',
      price: 'Price',
      savings: 'Savings',
      features: 'Features',
      highlighted: 'Highlight as "Most Popular"',
      note: 'Note',
      pricingNote: 'Pricing changes are immediately visible to users. The mobile app fetches pricing from the database, so updates apply across all platforms.',
    },
    
    // About
    about: {
      title: 'About Nova',
      description: 'Nova is a podcast platform built to help creators share meaningful stories and help listeners discover inspiration.',
      mission: 'On web, we provide a beautiful experience to browse episodes, manage subscriptions, and keep up with your favorite shows.',
    },
    
    // Contact
    contact: {
      title: 'Contact',
      subtitle: 'Questions or partnership inquiries? Send us a message.',
      name: 'Name',
      message: 'Message',
      send: 'Send',
    },
    
    // Terms
    terms: {
      title: 'Terms of Service',
      placeholder: 'These are placeholder terms. Detailed terms will be added before launch.',
    },
    
    // Privacy
    privacy: {
      title: 'Privacy Policy',
      placeholder: 'Placeholder privacy policy. We respect your privacy and will document practices clearly prior to launch.',
    },
    
    // Footer
    footer: {
      terms: 'Terms',
      privacy: 'Privacy',
      copyright: '© {{year}} Nova',
    },
    
    // Common
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      comingSoon: 'Coming Soon',
      episodes: 'episodes',
      signOut: 'Sign out',
    },
  },
};

// Helper function to get translation
export function t(key: string, lang: 'en' | 'rw' = 'en', params?: Record<string, any>): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      console.warn(`Translation missing: ${key} (${lang})`);
      return key;
    }
  }
  
  if (typeof value !== 'string') {
    console.warn(`Translation is not a string: ${key} (${lang})`);
    return key;
  }
  
  // Simple parameter replacement
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, param) => params[param] ?? '');
  }
  
  return value;
}

// Language context type
export type Language = 'en' | 'rw';

export const defaultLanguage: Language = 'en';
