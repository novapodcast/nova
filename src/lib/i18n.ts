// Website i18n configuration using the same structure as mobile app
// This ensures consistency across platforms

export const translations = {
  rw: {
    // Navigation & Common
    nav: {
      home: 'Ahabanza',
      episodes: 'Ibice',
      podcasts: 'Podikasti',
      pricing: 'Ibiciro',
      about: 'Abo turi bo',
      contact: 'Twandikire',
      signIn: 'Injira',
      signOut: 'Sohoka',
      dashboard: 'Ibiro',
      admin: 'Ubuyobozi',
    },
    
    // Home Page
    home: {
      tagline: 'Umva ku buryo bwimbitse. Shyigikira Nova.',
      subtitle: 'Urubuga rw’u Rwanda rw’amapodikasiti yigenga — inkuru, ibitekerezo, n’ibiganiro bifite akamaro.',
      startListening: 'Tangira Kumva',
      browsePlans: 'Reba Gahunda',
      episodesAvailable: 'Ibice 150K+ Biraboneka',
      featuredEpisodes: 'Ibiganiro byihariye',
      featuredPodcasts: 'Podikasti zigaragara',
      viewAll: 'Reba byose',
    },
    
    // Episodes
    episodes: {
      title: 'Ibice',
      loading: 'Birimo gutegurwa...',
      episode: 'Igice',
      untitled: 'Nta zina',
      notFound: 'Igice nticyabonetse cyangwa ntikiboneka.',
      backToPodcast: 'Subira ku Podikasti',
      listenNow: 'Kumva None',
      preparingStream: 'Tegura iyumvikano…',
      upgradeRequired: 'Gahunda yawe igenzura ibiri kuri iki gice. Ihindure gahunda kugira ngo ukomeze.',
      upgradeLink: 'Ihindure gahunda kugira ngo ukomeze',
      relatedEpisodes: 'Ibice bifa',
    },
    
    
    pricing: {
      title: 'Ibiciro Byoroshye kandi Bisobanutse',
      subtitle: 'Hitamo gahunda ijyanye n’ibyo ukeneye kuri podcast. Gahunda zose zitanga uburenganzira bwo gukoresha urubuga rwacu.',
      chooseDuration: 'Hitamo uburyo bwo kwishyura',
      billingMonthly: 'Ukwezi',
      billingAnnual: 'Umwaka (−25%)',
      billedYearly: '/ kwezi, wishyura rimwe mu mwaka',
      annualDiscount: '−25% igabanywa k\'umwaka',
      free: 'Ubuntu',
      perMonth: 'ku kwezi',
      forMonths: 'mu mezi {{count}}',
      save: 'Uzigama {{percent}}%',
      choosePlan: 'Hitamo Gahunda',
      subscribe: 'Iyandikisha',
      getStarted: 'Tangira',
      needCustom: 'Ukeneye gahunda yihariye?',
      contactUs: 'Twandikire',
      allPricesInRWF: 'Ibiciro byose biri mu mafaranga y’u Rwanda (RWF).',
    },
    
    
    // Checkout
    checkout: {
      title: 'Ishyura',
      selectedPlan: 'Gahunda wahisemo',
      paymentMethod: 'Uburyo bwo kwishyura',
      phoneNumber: 'Numero ya telefoni',
      processing: 'Birimo gutunganywa...',
      payNow: 'Ishyura Ubu',
      checkingStatus: 'Birimo kugenzura uko ubwishyu buhagaze...',
      paymentSuccess: 'Ubwishyu bwagenze neza',
      paymentPending: 'Ubwishyu buracyatunganywa',
      paymentFailed: 'Ubwishyu ntibwagenze neza',
      orderId: 'Order',
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
      continueWithGoogle: 'Komeza ukoresheje Google',
      signingIn: 'Birimo kwinjira...',
      signingUp: 'Birimo kwiyandikisha...',
      noAccount: 'Nta konti ufite?',
      createOne: 'Kora konti',
      haveAccount: 'Ufite konti?',
      signInHere: 'Injira hano',
      agreePrefix: 'Nemeye',
      and: 'na',
    },
    
    // Dashboard
    dashboard: {
      title: 'Ibiro',
      welcomeBack: 'Murakaza neza, {{name}}',
      goodMorning: 'Mwaramutse, {{name}}',
      goodAfternoon: 'Mwiriwe, {{name}}',
      goodEvening: 'Mugoroba mwiza, {{name}}',
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
      browseEpisodes: 'Reba ibice (Podcasts)',
      yourFavorites: 'Ibyakunze byawe',
      tip: 'Icyitonderwa',
      dashboardTip: 'Ibiro byawe byerekana amakuru yigihe nyacyo kuva muri Supabase. Iyandikishe kuri gahunda kugirango ufungure ibintu byiza!',
      // Intelligence Dashboard
      continueListening: 'Komeza Kumva',
      noInProgress: 'Nta gice urimo kumva.',
      resume: 'Komeza',
      listeningStreak: 'Iminsi yikurikirana',
      currentStreak: 'Iyi',
      bestStreak: 'Yiza',
      days: 'iminsi',
      minutesListened: 'Iminota yumvise',
      today: 'Uyu munsi',
      thisWeek: 'Icyumweru',
      thisMonth: 'Uku kwezi',
      lifetime: 'Bose',
      episodes: 'Ibice',
      started: 'Byatangiye',
      completed: 'Byarangiye',
      completionRate: 'Kujuza',
      weeklyActivity: 'Ibyakozwe mu cyumweru',
      listeningJourney: 'Uruendo rw\'umva',
      yourListeningDNA: 'DNA y\'umva wawe',
      topPodcast: 'Podikasti ikunzwe',
      topCategory: 'Icyiciro cyibanzwe',
      favoriteSpeaker: 'Uwavuze ukunda',
      favoriteTime: 'Igihe ukunda',
      favoriteDay: 'Umunsi ukunda',
      recentlyFinished: 'Byarangiye vuba',
      playAgain: 'Ongera umve',
      discoverMore: 'Shakisha ibindi',
      achievements: 'Ibyiza byawe',
      manage: 'Genzura',
      noListeningHistory: 'Nta makuru yumvwe. Tangira kumva podikasiti!',
      browsePodcasts: 'Reba Podikasiti',
      morning: 'Mu gitondo',
      afternoon: 'Mu manya',
      evening: 'Nijoro',
      night: 'Mu bitondo',
      firstPodcast: 'Podikasti ya mbere',
      tenEpisodes: 'Ibice 10',
      sevenDayStreak: 'Iminsi 7 ikurikirana',
      hundredHours: 'Amasaha 100',
      explorer: 'Mushakashakishije',
      consistentListener: 'Umvise uhoraho',
      unlocked: 'Byafunguwe',
      locked: 'Bifunze',
      noRecommendations: 'Hakora ibice byo kumva kugira ngo ubone ibyakwifuzwa.',
      // Subscription status
      statusActive: 'Kirakora',
      statusInactive: 'Ntibirakora',
      statusExpired: 'Byarengeye igihe',
      statusCancelled: 'Byahagaritswe',
      statusPastDue: 'Harenze igihe cy\'ubwishyu',
      statusTrialing: 'Igihe cy\'ibigeragezo',
      // Recommendation group titles (server returns titleKey)
      recBecauseYouListened: 'Kubera ko wumvise {{name}}',
      recNewFromFollows: 'Ibice bishya kuvukora ukurikirana',
      recTrendingCategory: 'Bikunzwe mu cyiciro cyibanzwe',
      recLatestEpisodes: 'Ibice byaheruka',
      // Structured insights (server returns { type, params })
      insight: {
        weekly_growth: 'Wumvise byiyongereyeho {{percentage}}% mu cyumweru gishize.',
        weekly_decline: 'Wumvise byagabanyijeho {{percentage}}% mu cyumweru gishize.',
        welcome_back: 'Wongeye kumva mu cyumweru — murakaza neza!',
        monthly_completion_up: 'Wangije ibice {{count}} byiyongereye ukugereranya n\'ukwezi gushize.',
        monthly_completion_down: 'Wangije ibice {{count}} byagabanyijwe ukugereranya n\'ukwezi gushize.',
        monthly_completion_first: 'Wangije ibice {{count}} mu kwezi kwose!',
        streak_gap: 'Ugasigaranye iminsi {{gap}} kugira ngo ugere ku ndunduro yawe y\'iminsi {{best}}.',
        streak_matching: 'Ugereranya n\'indunduro yawe y\'amateka — iminsi {{current}}!',
        listening_pattern: 'Ukimara kumva mu {{when}} mu {{period}}.',
        completion_low: 'Watangiye ibice {{started}} ariko wangije {{completed}} gusa. Gerageza ibice byoroheje!',
      },
      // Time-of-day + day-type tokens used by listening_pattern insight
      weekdays: 'mu minsi y\'akazi',
      weekends: 'mu minsi y\'ipetero',
    },

    // Podcast detail page
    podcasts: {
      notFound: 'Podikasti ntabwo iboneka',
      backToPodcasts: 'Subira ku Podikasti',
      episodes: 'Ibice',
      noEpisodes: 'Nta bice biboneka kuri iyi podikasti.',
      episodeNumber: 'Igice {{num}}',
      comingSoon: 'Ntabwo iboneka',
      viewDetails: 'Reba byose',
      requiresHigherPlan: 'Iyi gice kirisaba gahunda irenze iyawe',
      upgradePrompt: 'Gahunda yawe ntigizemo ibiri kuri iyi gice.',
      upgradePlan: 'Iyandikishe',
      browseOtherEpisodes: 'Komeza kureba',
      loadingStream: 'Birategura…',
      nowPlaying: 'Birimo gukina',
      coverComingSoon: 'Ifoto iri ku nzira',
      updated: 'Byavuguruwe',
      plays: 'Abumva',
      episodesCount: 'ibice',
    },

    // Billing pages
    billing: {
      title: 'Ibyo wishyurwa',
      currentPlan: 'Gahunda Kuri Ubu',
      active: 'Kirakora',
      inactive: 'Ntibirakora',
      renews: 'Bizongera:',
      changePlan: 'Hindura gahunda',
      noActivePlan: 'Nta gahunda ikora',
      browsePlans: 'Reba gahunda',
      paymentHistory: 'Amateka y\'ubwishyu',
      noPayments: 'Nta bwishyu bwakozwe.',
      receipt: 'Icyemezo',
      history: 'Amateka y\'ubwishyu',
      recentPayments: 'Ubwishyu bwawe bwaherukanye',
      noPaymentsFound: 'Nta bwishyu bwabonetse.',
      subscriptionPayment: 'Ubwishyu bw\'iyandikishe',
      loading: 'Birimo gutegurwa…',
      getStarted: 'Tangira',
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
      title: 'Abo turibo Nova',
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
    
    // Profile
    profile: {
      editProfile: 'Hindura umwirondoro',
      accountSettings: 'Igenamiterere rya Konti',
      profile: 'Umwirondoro',
      billing: 'Ikwishyura',
      invoices: 'Inyemezabwishyu',
      personalDetails: 'Amakuru y\'Umuntu',
      firstName: 'Izina rya mbere',
      lastName: 'Izina rya nyuma',
      yourAccess: 'Uburyo bwo kugera',
      memberSince: 'Munyamuryango kuva',
      noBillingData: 'Nta makuru y\'ubwishyu yaboneka',
      noBillingDataSubtitle: 'Iyandikishe kuri gahunda ukeneye kugirango urebe amakuru y\'ubwishyu bwawe',
      viewPlans: 'Reba Gahunda',
      noInvoices: 'Nta nyemezabwishyu zaboneka',
      invoiceNo: 'Nimero ya Nyemezabwishyu',
      date: 'Itariki',
      amount: 'Amafaranga',
      status: 'Uko Bihagaze',
      actions: 'Igikorwa',
      receipt: 'Icyemezo',
      currentPlan: 'Gahunda Kuri Ubu',
      noActivePlan: 'Nta gahunda ikora',
      browsePlans: 'Reba gahunda',
      changePlan: 'Hindura gahunda',
      active: 'Birakora',
      inactive: 'Ntibirakora',
      renews: 'Bizongera',
      welcome: 'Murakaza neza, {{name}}!',
      email: 'Imeyili',
      emailReadonly: 'Imeyili ntishobora guhindurwa',
      fullName: 'Amazina yuzuye',
      fullNamePlaceholder: 'Andika amazina yawe',
      avatarUrl: 'Ifoto yawe (URL)',
      avatarHint: 'Shyiramo URL y\'ifoto yawe',
      updateSuccess: 'Umwirondoro wahinduwe neza',
      updateError: 'Habayeho ikosa mu guhindura umwirondoro',
      save: 'Bika',
      saving: 'Birimo kubikwa...',
      cancel: 'Hagarika',
    },
    
    // Common
    common: {
      loading: 'Birimo gutegurwa...',
      error: 'Habayeho ikosa',
      success: 'Byagenze neza',
      comingSoon: 'Biza vuba',
      episodes: 'ibice (Podcasts)',
      signOut: 'Sohoka',
      save: 'Bika',
      saving: 'Birimo kubikwa...',
      cancel: 'Hagarika',
      month: 'ukwezi',
      months: 'amezi',
      viewDashboard: 'Reba ibiro',
      tryAgain: 'Ongera ugerageze',
      untitled: 'Nta zina',
      plays: 'imikino',
      billing: 'Ibyo wishyurwa',
    },
  },
  
  en: {
    // Navigation & Common
    nav: {
      home: 'Home',
      episodes: 'Episodes',
      podcasts: 'Podcasts',
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
      tagline: 'Listen deeper. Support Nova.',
      subtitle: "Rwanda's home for independent podcasting — stories, ideas, and conversations that matter.",
      startListening: 'Start Listening',
      browsePlans: 'Browse Plans',
      episodesAvailable: '150K+ Episodes Available',
      featuredEpisodes: 'Featured Episodes',
      featuredPodcasts: 'Featured Podcasts',
      viewAll: 'View all',
    },
    
    // Episodes
    episodes: {
      title: 'Episodes',
      loading: 'Loading...',
      episode: 'Episode',
      untitled: 'Untitled',
      notFound: 'Episode not found or unavailable.',
      backToPodcast: 'Back to Podcast',
      listenNow: 'Listen Now',
      preparingStream: 'Preparing your stream…',
      upgradeRequired: 'Your current plan does not include this content. Upgrade to continue.',
      upgradeLink: 'Upgrade to continue',
      relatedEpisodes: 'Related Episodes',
    },

    // Pricing
    pricing: {
      title: 'Simple, Transparent Pricing',
      subtitle: 'Choose the plan that fits your podcasting needs. All plans include access to our platform.',
      chooseDuration: 'Choose Billing',
      billingMonthly: 'Monthly',
      billingAnnual: 'Annual (25% off)',
      billedYearly: '/ mo, billed yearly',
      annualDiscount: '−25% annual discount',
      free: 'Free',
      perMonth: 'per month',
      forMonths: 'for {{count}} months',
      save: 'Save {{percent}}%',
      choosePlan: 'Choose Plan',
      subscribe: 'Subscribe',
      getStarted: 'Get Started',
      needCustom: 'Need a custom plan?',
      contactUs: 'Contact us',
      allPricesInRWF: 'All prices in Rwandan Francs (RWF).',
    },
    
    // Checkout
    checkout: {
      title: 'Checkout',
      selectedPlan: 'Selected Plan',
      paymentMethod: 'Payment Method',
      phoneNumber: 'Phone Number',
      processing: 'Processing...',
      payNow: 'Pay Now',
      checkingStatus: 'Checking payment status...',
      paymentSuccess: 'Payment Successful',
      paymentPending: 'Payment Pending',
      paymentFailed: 'Payment Failed',
      orderId: 'Order',
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
      continueWithGoogle: 'Continue with Google',
      signingIn: 'Signing in...',
      signingUp: 'Signing up...',
      noAccount: 'No account?',
      createOne: 'Create one',
      haveAccount: 'Have an account?',
      signInHere: 'Sign in here',
      agreePrefix: 'I agree to the',
      and: 'and',
    },
    
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcomeBack: 'Welcome back, {{name}}',
      goodMorning: 'Good morning, {{name}}',
      goodAfternoon: 'Good afternoon, {{name}}',
      goodEvening: 'Good evening, {{name}}',
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
      // Intelligence Dashboard
      continueListening: 'Continue Listening',
      noInProgress: 'No episodes in progress.',
      resume: 'Resume',
      listeningStreak: 'Listening Streak',
      currentStreak: 'Current',
      bestStreak: 'Best',
      days: 'days',
      minutesListened: 'Minutes Listened',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      lifetime: 'Lifetime',
      episodes: 'Episodes',
      started: 'Started',
      completed: 'Completed',
      completionRate: 'Completion',
      weeklyActivity: 'Weekly Activity',
      listeningJourney: 'Listening Journey',
      yourListeningDNA: 'Your Listening DNA',
      topPodcast: 'Top Podcast',
      topCategory: 'Top Category',
      favoriteSpeaker: 'Favorite Speaker',
      favoriteTime: 'Favorite Time',
      favoriteDay: 'Favorite Day',
      recentlyFinished: 'Recently Finished',
      playAgain: 'Play Again',
      discoverMore: 'Discover More',
      achievements: 'Achievements',
      manage: 'Manage',
      noListeningHistory: 'No listening history yet. Start listening to podcasts!',
      browsePodcasts: 'Browse Podcasts',
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night',
      firstPodcast: 'First Podcast',
      tenEpisodes: '10 Episodes',
      sevenDayStreak: '7-Day Streak',
      hundredHours: '100 Hours',
      explorer: 'Explorer',
      consistentListener: 'Consistent Listener',
      unlocked: 'Unlocked',
      locked: 'Locked',
      noRecommendations: 'Listen to a few episodes to get personalized recommendations.',
      // Subscription status
      statusActive: 'Active',
      statusInactive: 'Inactive',
      statusExpired: 'Expired',
      statusCancelled: 'Cancelled',
      statusPastDue: 'Past due',
      statusTrialing: 'Trialing',
      // Recommendation group titles (server returns titleKey)
      recBecauseYouListened: 'Because you listened to {{name}}',
      recNewFromFollows: 'New from creators you follow',
      recTrendingCategory: 'Trending in your favorite category',
      recLatestEpisodes: 'Latest episodes',
      // Structured insights (server returns { type, params })
      insight: {
        weekly_growth: 'You listened {{percentage}}% more than last week.',
        weekly_decline: 'You listened {{percentage}}% less than last week.',
        welcome_back: 'You started listening again this week — welcome back!',
        monthly_completion_up: 'You completed {{count}} more episode(s) than last month.',
        monthly_completion_down: 'You completed {{count}} fewer episode(s) than last month.',
        monthly_completion_first: 'You completed {{count}} episode(s) this month!',
        streak_gap: 'You\'re only {{gap}} day(s) away from your best streak of {{best}} days.',
        streak_matching: 'You\'re matching your best streak ever — {{current}} day(s)!',
        listening_pattern: 'You usually listen on {{when}} during the {{period}}.',
        completion_low: 'You\'ve started {{started}} episodes but only finished {{completed}}. Try shorter episodes!',
      },
      // Time-of-day + day-type tokens used by listening_pattern insight
      weekdays: 'weekdays',
      weekends: 'weekends',
    },

    // Podcast detail page
    podcasts: {
      notFound: 'Podcast not found',
      backToPodcasts: 'Back to Podcasts',
      episodes: 'Episodes',
      noEpisodes: 'No episodes available for this podcast yet.',
      episodeNumber: 'Episode {{num}}',
      comingSoon: 'Coming soon',
      viewDetails: 'View details',
      requiresHigherPlan: 'This episode requires a higher plan',
      upgradePrompt: 'Your current plan does not include this content.',
      upgradePlan: 'Upgrade Plan',
      browseOtherEpisodes: 'Browse other episodes',
      loadingStream: 'Loading stream…',
      nowPlaying: 'Now Playing',
      coverComingSoon: 'Cover coming soon',
      updated: 'Updated',
      plays: 'Plays',
      episodesCount: 'Episodes',
    },

    // Billing pages
    billing: {
      title: 'Billing',
      currentPlan: 'Current Plan',
      active: 'Active',
      inactive: 'Inactive',
      renews: 'Renews:',
      changePlan: 'Change plan',
      noActivePlan: 'No active plan',
      browsePlans: 'Browse plans',
      paymentHistory: 'Payment History',
      noPayments: 'No payments yet.',
      receipt: 'Receipt',
      history: 'Billing History',
      recentPayments: 'Your recent payments',
      noPaymentsFound: 'No payments found.',
      subscriptionPayment: 'Subscription payment',
      loading: 'Loading…',
      getStarted: 'Get Started',
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
    
    // Profile
    profile: {
      editProfile: 'Edit Profile',
      accountSettings: 'Account Settings',
      profile: 'Profile',
      billing: 'Billing',
      invoices: 'Invoices',
      personalDetails: 'Personal Details',
      firstName: 'First Name',
      lastName: 'Last Name',
      yourAccess: 'Your Access',
      memberSince: 'Member since',
      noBillingData: 'No billing data found',
      noBillingDataSubtitle: 'Subscribe to your favorite plan to see your billing information',
      viewPlans: 'View Plans',
      noInvoices: 'No invoices found',
      invoiceNo: 'Invoice No.',
      date: 'Date',
      amount: 'Amount',
      status: 'Status',
      actions: 'Actions',
      receipt: 'Receipt',
      currentPlan: 'Current Plan',
      noActivePlan: 'No active plan',
      browsePlans: 'Browse plans',
      changePlan: 'Change plan',
      active: 'Active',
      inactive: 'Inactive',
      renews: 'Renews',
      welcome: 'Welcome {{name}}!',
      email: 'Email',
      emailReadonly: 'Email cannot be changed',
      fullName: 'Full Name',
      fullNamePlaceholder: 'Enter your full name',
      avatarUrl: 'Avatar URL',
      avatarHint: 'Enter a URL for your profile picture',
      updateSuccess: 'Profile updated successfully',
      updateError: 'Failed to update profile',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
    },
    
    // Common
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      comingSoon: 'Coming Soon',
      episodes: 'episodes',
      signOut: 'Sign out',
      save: 'Save Changes',
      saving: 'Saving...',
      cancel: 'Cancel',
      month: 'month',
      months: 'months',
      viewDashboard: 'View dashboard',
      tryAgain: 'Try again',
      untitled: 'Untitled',
      plays: 'plays',
      billing: 'Billing',
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

/**
 * Resolve a structured insight object (returned by /api/analytics/user) into a
 * localized, human-readable string. The server returns objects of the form
 * { type: string, params?: Record<string, any> } so the client can translate
 * them with the existing i18n system instead of receiving English sentences.
 *
 * Unknown insight types fall back to the type key (never throw).
 */
export function renderInsight(
  insight: { type: string; params?: Record<string, any> },
  lang: 'en' | 'rw' = 'en'
): string {
  const params: Record<string, any> = { ...(insight.params || {}) };

  // The listening_pattern insight references time-of-day (period) and a
  // weekday/weekend token. Translate both before substitution.
  if (insight.type === 'listening_pattern') {
    if (typeof params.period === 'string') {
      params.period = t(`dashboard.${params.period}`, lang);
    }
    if (typeof params.when === 'string') {
      params.when = t(`dashboard.${params.when}`, lang);
    }
  }

  return t(`dashboard.insight.${insight.type}`, lang, params);
}

// Language context type
export type Language = 'en' | 'rw';

export const defaultLanguage: Language = 'en';
