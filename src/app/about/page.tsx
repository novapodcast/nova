"use client";
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function AboutPage() {
  const { language } = useLanguage();
  
  const categories = [
    { name_en: 'Heaven', name_rw: 'IJURU', color: '#3b82f6', desc_en: 'Spiritual growth and faith', desc_rw: 'Imana n\'ubuzima bw\'umwuka' },
    { name_en: 'Home', name_rw: 'URUGO', color: '#8b5cf6', desc_en: 'Family and household', desc_rw: 'Umuryango n\'urugo' },
    { name_en: 'Self-Knowledge', name_rw: 'KWIMENYA', color: '#ec4899', desc_en: 'Personal development', desc_rw: 'Kwimenya no gukura' },
    { name_en: 'Community', name_rw: 'UBUMANA', color: '#f59e0b', desc_en: 'Relationships', desc_rw: 'Ubucuti n\'ubumwe' },
    { name_en: 'Parenting', name_rw: 'KURERA', color: '#10b981', desc_en: 'Raising children', desc_rw: 'Uburere bw\'abana' },
    { name_en: 'Love', name_rw: 'URUKUNDO', color: '#ef4444', desc_en: 'Love and relationships', desc_rw: 'Urukundo n\'imibanire' },
    { name_en: 'Prosperity', name_rw: 'UBUKIRE', color: '#84cc16', desc_en: 'Wealth and abundance', desc_rw: 'Ubukire n\'iterambere' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-b from-black via-[#0a0a0a] to-[#0a0a0a] py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
        </div>
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-muted">About Nova</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            {language === 'rw' ? 'Abo turi bo' : 'Who We Are'}
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-3xl mx-auto leading-relaxed">
            {language === 'rw' 
              ? 'Podcasts zituma ubuzima bwawe buhinduka, zivuga mu rurimi rwawe.'
              : 'Podcasts that transform your life, spoken in your language.'}
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="container py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            {language === 'rw' ? 'Intego Yacu' : 'Our Mission'}
          </h2>
          <div className="space-y-6 text-lg leading-relaxed text-muted">
            <p>
              {language === 'rw'
                ? 'Nova yakomotse ku nyota idasanzwe — inyota y’igisekuru gishaka ibisobanuro n’intego y’ubuzima irenze urusaku n’urujijo by’isi ya none. Turi urubuga rw’amajwi rushingiye kuri Kristo, rwemera ko buri muntu afite muri we imbuto y’ubushobozi n’ubwiza Imana yamushyizemo, itegereje gukangurwa n’ijambo ryiza rivuzwe mu gihe gikwiye.'
                : 'Nova was born out of a deep hunger — the hunger of a generation seeking meaning beyond the noise of modern life. We are a Christ-centred audio platform that believes every person carries within them a seed of greatness, waiting to be awakened by the right word at the right moment.'}
            </p>
            <p>
              {language === 'rw'
                ? 'Binyuze mu nkuru zateguwe neza, inyigisho n’ibiganiro byubakiye ku byiciro birindwi by’ubuzima — IJURU, URUGO, KWIMENYA, UBUMANA, KURERA, URUKUNDO, na UBUKIRE — Nova yita ku muntu wese uko yakabaye: umwuka, ibitekerezo, umuryango, imibanire n’intego y’ubuzima. Buri nkuru ni ubutumire bwo kujya mu mizi y’ibintu, kubaho neza kurushaho, no kuba uwo Imana yakuremeye kuba we.'
                : 'Through carefully crafted stories, teachings, and conversations organised into seven life categories — IJURU, URUGO, KWIMENYA, UBUMANA, KURERA, URUKUNDO, and UBUKIRE — Nova speaks to the whole person: spirit, mind, family, relationships, and purpose. Each story is an invitation to go deeper, to live better, and to become who God created you to be.'}
            </p>
            <p>
              {language === 'rw'
                ? 'Twishimira kuba dushingiye mu Rwanda, tuvuga Ikinyarwanda kandi twubakiye ku mutima w’Abanyarwanda — abantu barangwa no kwihangana, kwizera no kugira icyizere gikomeye cy’ejo hazaza.'
                : 'We are proudly rooted in Rwanda, speaking in Kinyarwanda and carrying the heartbeat of our people — a people of resilience, faith, and extraordinary hope.'}
            </p>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-[var(--surface)] py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'rw' ? 'Ibyiciro byacu birindwi' : 'Our Seven Categories'}
            </h2>
            <p className="text-muted text-lg">
              {language === 'rw'
                ? 'Buri cyiciro kivuga ku gice cy\'ubuzima bwawe, kiguha inyigisho n\'imbaraga zo gukura.'
                : 'Each category speaks to a part of your life, giving you wisdom and strength to grow.'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {categories.map((cat) => (
              <div
                key={cat.name_rw}
                className="bg-black/40 rounded-xl p-6 border border-white/5 hover:border-white/20 transition group"
              >
                <div
                  className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center"
                  style={{ backgroundColor: cat.color + '20', border: `2px solid ${cat.color}40` }}
                >
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: cat.color }} />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {language === 'rw' ? cat.name_rw : cat.name_en}
                </h3>
                <p className="text-sm text-muted">
                  {language === 'rw' ? cat.desc_rw : cat.desc_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="container py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            {language === 'rw' ? 'Indangagaciro zacu' : 'Our Values'}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-bold mb-2">
                {language === 'rw' ? 'Ukuri' : 'Truth'}
              </h3>
              <p className="text-sm text-muted">
                {language === 'rw'
                  ? 'Turavuga ukuri kw\'Ijambo ry\'Imana mu buzima bwa buri munsi.'
                  : 'We speak the truth of God\'s Word into everyday life.'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❤️</span>
              </div>
              <h3 className="text-xl font-bold mb-2">
                {language === 'rw' ? 'Urukundo' : 'Love'}
              </h3>
              <p className="text-sm text-muted">
                {language === 'rw'
                  ? 'Turemera ko urukundo ari imbaraga zikomeye zo guhindura.'
                  : 'We believe love is the most powerful force for transformation.'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌱</span>
              </div>
              <h3 className="text-xl font-bold mb-2">
                {language === 'rw' ? 'Gukura' : 'Growth'}
              </h3>
              <p className="text-sm text-muted">
                {language === 'rw'
                  ? 'Turafasha abantu gukura mu mwuka, ubwenge, n\'imibanire.'
                  : 'We help people grow in spirit, mind, and relationships.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 py-16">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {language === 'rw' ? 'Tangira urugendo rwawe' : 'Start Your Journey'}
          </h2>
          <p className="text-lg text-muted mb-8 max-w-2xl mx-auto">
            {language === 'rw'
              ? 'Injira muri Nova ubone podcasts zizaguhindura ubuzima bwawe.'
              : 'Join Nova and discover podcasts that will transform your life.'}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/episodes"
              className="px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition"
            >
              {language === 'rw' ? 'Tangira Kumva' : 'Start Listening'}
            </a>
            <a
              href="/pricing"
              className="px-6 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/5 transition"
            >
              {language === 'rw' ? 'Reba Ibiciro' : 'View Pricing'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
