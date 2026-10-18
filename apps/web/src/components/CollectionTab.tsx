import React, { useEffect, useState } from 'react';
import { CardRarity } from '@kidsgo/shared';

interface CardItem {
  id: string;
  slug: string;
  name: string;
  rarity: CardRarity;
  illustration: string;
  stats?: { power?: string; attack?: number };
  obtained: boolean;
  obtained_at: string | null;
}

interface BadgeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  awarded_at: string | null;
}

export const CollectionTab: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | CardRarity>('all');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/rewards/cards', { credentials: 'include' }).then((res) => res.json()),
      fetch('/api/rewards/badges', { credentials: 'include' }).then((res) => res.json()),
    ])
      .then(([cardData, badgeData]) => {
        if (cardData.success && cardData.data?.cards) {
          setCards(cardData.data.cards);
        }
        if (badgeData.success && badgeData.data?.badges) {
          setBadges(badgeData.data.badges);
        }
      })
      .catch((err) => {
        console.error('Failed to load collections:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredCards = activeFilter === 'all' ? cards : cards.filter((c) => c.rarity === activeFilter);
  const ownedCardsCount = cards.filter((c) => c.obtained).length;
  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  const getRarityBadge = (rarity: CardRarity) => {
    switch (rarity) {
      case 'common':
        return <span className="badge" style={{ backgroundColor: 'var(--color-surface-soft)', color: 'var(--color-ink)' }}>Common</span>;
      case 'rare':
        return <span className="badge badge-primary">Rare</span>;
      case 'epic':
        return <span className="badge" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>Epic</span>;
      case 'legendary':
        return <span className="badge badge-sunshine">Legendary</span>;
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Koleksi */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
            Album Kartu & Lencana 🃏
          </h2>
          <span className="badge badge-mint" style={{ fontSize: '0.75rem' }}>
            {ownedCardsCount} Kartu • {unlockedBadgesCount} Lencana
          </span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: '4px' }}>
          Koleksi kartu pahlawan dan lencana hasil perjuangan belajarmu!
        </p>
      </div>

      {/* 2. Filter Rarity */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setActiveFilter(r)}
            className={activeFilter === r ? 'btn-primary' : 'btn-soft'}
            style={{
              padding: '6px 14px',
              minHeight: '34px',
              fontSize: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              textTransform: 'capitalize',
            }}
          >
            {r === 'all' ? 'Semua' : r}
          </button>
        ))}
      </div>

      {/* 3. Grid Kartu RPG */}
      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', color: 'var(--color-ink)' }}>
          Kartu Pahlawan Belajar ({filteredCards.length})
        </h3>

        {loading ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-muted)' }}>
            <span>Memuat kartu koleksi...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="card"
                style={{
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  opacity: card.obtained ? 1 : 0.65,
                  border: card.obtained
                    ? card.rarity === 'legendary'
                      ? '2px solid #F5C451'
                      : card.rarity === 'epic'
                      ? '2px solid #A855F7'
                      : '1px solid var(--color-border)'
                    : '1px dashed #D0D5DD',
                  backgroundColor: card.obtained ? 'var(--color-paper)' : 'var(--color-surface-soft)',
                  position: 'relative',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  {getRarityBadge(card.rarity)}
                </div>

                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '14px',
                    backgroundColor: card.obtained ? 'var(--color-surface-soft)' : '#E9ECEF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.25rem',
                    marginTop: '16px',
                    marginBottom: '10px',
                  }}
                >
                  {card.obtained ? card.illustration : '❓'}
                </div>

                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '4px' }}>
                  {card.obtained ? card.name : 'Kartu Misteri'}
                </h4>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                  {card.obtained
                    ? card.stats?.power || 'Kekuatan Aritmatika'
                    : 'Selesaikan level untuk membuka'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Lencana Penghargaan (Badges) */}
      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', color: 'var(--color-ink)' }}>
          Lencana Pencapaian
        </h3>
        {loading ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-muted)' }}>
            <span>Memuat lencana...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {badges.map((b) => (
              <div
                key={b.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  opacity: b.unlocked ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: b.unlocked ? 'var(--color-sunshine-soft)' : 'var(--color-surface-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}
                >
                  {b.unlocked ? b.icon : '🔒'}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>{b.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{b.description}</p>
                </div>
                {b.unlocked ? (
                  <span className="badge badge-mint">Didapat ✓</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Terkunci</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
