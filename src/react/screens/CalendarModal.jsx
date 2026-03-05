import React, { useState, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody } from '../components/Modal.jsx';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function CalendarModal({ isOpen, data, onClose }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const {
    months, currentDate, userGamesByDate, allGamesByDate,
    seasonDates, startYear, allTeams, userTeamId, gameState
  } = data || {};

  const dayDetail = useMemo(() => {
    if (!selectedDate || !gameState) return null;
    return buildDayDetail(selectedDate, gameState, allTeams, userTeamId);
  }, [selectedDate, gameState, allTeams, userTeamId]);

  if (!isOpen || !data) return null;

  const { allStarStart, allStarEnd, tradeDeadline, tier1End } = seasonDates || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={1100} zIndex={1300}>
      <ModalHeader onClose={onClose}>
        Season {startYear}–{(startYear + 1) % 100} Calendar
      </ModalHeader>

      <ModalBody style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        {/* Legend */}
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap',
          marginBottom: 16, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
        }}>
          <LegendItem bg="var(--color-bg-raised)" label="Home" />
          <LegendItem bg="var(--color-accent-bg)" label="Away" />
          <LegendItem bg="var(--color-warning-bg)" label="Event" />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 14, height: 14, display: 'inline-block',
              borderLeft: '3px solid var(--color-accent)', background: 'var(--color-bg-sunken)',
            }} />
            Today
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, display: 'inline-block', background: 'var(--color-win)' }} />
            Win
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, display: 'inline-block', background: 'var(--color-loss)' }} />
            Loss
          </span>
        </div>

        {/* Month Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: 'var(--gap)',
        }}>
          {(months || []).map(({ year, month }) => (
            <MonthCard key={`${year}-${month}`}
              year={year} month={month} currentDate={currentDate}
              userGamesByDate={userGamesByDate} allGamesByDate={allGamesByDate}
              allStarStart={allStarStart} allStarEnd={allStarEnd}
              tradeDeadline={tradeDeadline} tier1End={tier1End}
              selectedDate={selectedDate} onSelectDate={setSelectedDate}
            />
          ))}
        </div>

        {/* Day Detail Panel */}
        {dayDetail && (
          <DayDetailPanel detail={dayDetail} userTeamId={userTeamId}
            onShowBoxScore={(dateStr, homeId, awayId) => {
              if (window.showBoxScore) window.showBoxScore(dateStr, homeId, awayId);
            }}
          />
        )}
      </ModalBody>
    </Modal>
  );
}

function LegendItem({ bg, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 14, height: 14, display: 'inline-block', background: bg }} />
      {label}
    </span>
  );
}

function MonthCard({
  year, month, currentDate, userGamesByDate, allGamesByDate,
  allStarStart, allStarEnd, tradeDeadline, tier1End,
  selectedDate, onSelectDate,
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div style={{
      background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-subtle)',
      padding: 12,
    }}>
      <div style={{
        textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)',
        color: 'var(--color-text)', marginBottom: 10,
      }}>
        {MONTH_NAMES[month]} {year}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2, textAlign: 'center',
      }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{
            fontSize: 10, color: 'var(--color-text-tertiary)',
            padding: '2px 0', fontWeight: 600,
          }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return (
            <DayCell key={day} day={day} dateStr={dateStr}
              currentDate={currentDate} selectedDate={selectedDate}
              userGame={userGamesByDate?.[dateStr]}
              dayGames={allGamesByDate?.[dateStr]}
              allStarStart={allStarStart} allStarEnd={allStarEnd}
              tradeDeadline={tradeDeadline} tier1End={tier1End}
              onClick={onSelectDate}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  day, dateStr, currentDate, selectedDate, userGame, dayGames,
  allStarStart, allStarEnd, tradeDeadline, tier1End, onClick,
}) {
  const isToday = dateStr === currentDate;
  const isSelected = dateStr === selectedDate;
  const isAllStar = dateStr >= allStarStart && dateStr <= allStarEnd;
  const isTradeDeadline = dateStr === tradeDeadline;
  const isSeasonEnd = dateStr === tier1End;
  const isSpecial = isAllStar || isTradeDeadline || isSeasonEnd;
  const hasContent = userGame || (dayGames && dayGames.total > 0) || isSpecial;

  // Default: sunken (blends into grid)
  let bg = 'var(--color-bg-sunken)';
  let textColor = 'var(--color-text-tertiary)';
  let sub = '';
  let resultDot = null;

  if (userGame) {
    // User games pop out of the grid
    if (userGame.isHome) {
      bg = 'var(--color-bg-raised)';
    } else {
      bg = 'var(--color-accent-bg)';
    }
    textColor = 'var(--color-text)';
    const oppName = userGame.opponent ? userGame.opponent.name.split(' ').pop() : '???';
    sub = `${userGame.isHome ? 'vs' : '@'} ${oppName}`;

    if (userGame.played) {
      const won = userGame.isHome
        ? userGame.homeScore > userGame.awayScore
        : userGame.awayScore > userGame.homeScore;
      resultDot = won ? 'var(--color-win)' : 'var(--color-loss)';
    }
  } else if (isSpecial) {
    bg = 'var(--color-warning-bg)';
    textColor = 'var(--color-warning)';
    sub = isAllStar ? 'ASG' : isTradeDeadline ? 'TDL' : 'END';
  } else if (dayGames && dayGames.total > 0) {
    // League games stay sunken
    sub = `${dayGames.total}g`;
  }

  return (
    <div
      onClick={hasContent ? () => onClick(dateStr) : undefined}
      style={{
        background: isSelected ? 'var(--color-accent-bg)' : bg,
        padding: '4px 3px', minHeight: 44,
        borderLeft: isToday ? '3px solid var(--color-accent)' : undefined,
        cursor: hasContent ? 'pointer' : 'default',
        transition: 'all 100ms ease',
        position: 'relative',
      }}
    >
      <div style={{
        fontSize: 11,
        fontWeight: isToday ? 700 : userGame ? 600 : 400,
        color: textColor,
      }}>{day}</div>
      {sub && (
        <div style={{
          fontSize: 9, color: textColor, opacity: 0.75,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginTop: 1,
        }}>{sub}</div>
      )}
      {resultDot && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 5, height: 5, background: resultDot,
        }} />
      )}
    </div>
  );
}

function DayDetailPanel({ detail, userTeamId, onShowBoxScore }) {
  const { formattedDate, event, userGame, otherGames, dateStr } = detail;

  return (
    <div style={{
      marginTop: 'var(--gap)', background: 'var(--color-bg-sunken)',
      border: '1px solid var(--color-border-subtle)', padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
      }}>
        {formattedDate}
      </div>

      {event && (
        <div style={{
          marginBottom: 12, padding: '8px 12px',
          background: 'var(--color-warning-bg)',
          color: 'var(--color-warning)', fontSize: 'var(--text-sm)', fontWeight: 600,
        }}>{event}</div>
      )}

      {!userGame && otherGames.length === 0 && (
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
          No games scheduled
        </div>
      )}

      {userGame && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: 'var(--color-accent)',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
          }}>Your Game</div>
          <GameRow game={userGame} userTeamId={userTeamId}
            dateStr={dateStr} onShowBoxScore={onShowBoxScore} highlight />
        </div>
      )}

      {otherGames.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{
            cursor: 'pointer', color: 'var(--color-text-tertiary)',
            fontSize: 'var(--text-xs)', marginBottom: 6,
          }}>
            {otherGames.length} other game{otherGames.length !== 1 ? 's' : ''} today
          </summary>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            maxHeight: 300, overflowY: 'auto',
          }}>
            {otherGames.map((g, i) => (
              <GameRow key={i} game={g} userTeamId={userTeamId}
                dateStr={dateStr} onShowBoxScore={onShowBoxScore} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function GameRow({ game, userTeamId, dateStr, onShowBoxScore, highlight }) {
  if (!game.played) {
    return (
      <div style={{
        background: highlight ? 'var(--color-accent-bg)' : 'var(--color-bg-active)',
        border: highlight ? '1px solid var(--color-accent-border)' : '1px solid var(--color-border-subtle)',
        padding: '10px 12px', fontSize: 'var(--text-sm)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500 }}>{game.homeName}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>—</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontWeight: 500 }}>{game.awayName}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>—</span>
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          {highlight ? (game.homeTeamId === userTeamId ? 'Home' : 'Away') + ' · ' : ''}Upcoming
        </div>
      </div>
    );
  }

  const homeWon = game.homeScore > game.awayScore;
  return (
    <div
      onClick={() => onShowBoxScore(dateStr, game.homeTeamId, game.awayTeamId)}
      style={{
        background: highlight ? 'var(--color-accent-bg)' : 'var(--color-bg-raised)',
        border: highlight ? '1px solid var(--color-accent-border)' : '1px solid var(--color-border-subtle)',
        padding: '10px 12px', cursor: 'pointer', fontSize: 'var(--text-sm)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{
          fontWeight: homeWon ? 600 : 400,
          color: homeWon ? 'var(--color-text)' : 'var(--color-text-secondary)',
        }}>{game.homeName}</span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: homeWon ? 700 : 400,
          color: homeWon ? 'var(--color-text)' : 'var(--color-text-secondary)',
        }}>{game.homeScore}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{
          fontWeight: !homeWon ? 600 : 400,
          color: !homeWon ? 'var(--color-text)' : 'var(--color-text-secondary)',
        }}>{game.awayName}</span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: !homeWon ? 700 : 400,
          color: !homeWon ? 'var(--color-text)' : 'var(--color-text-secondary)',
        }}>{game.awayScore}</span>
      </div>
      {highlight && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          {game.homeTeamId === userTeamId ? 'Home' : 'Away'}
          {' · '}{homeWon === (game.homeTeamId === userTeamId) ? 'W' : 'L'}
          {' · View Box Score →'}
        </div>
      )}
    </div>
  );
}

function buildDayDetail(dateStr, gameState, allTeams, userTeamId) {
  const CalendarEngine = window.CalendarEngine;
  if (!CalendarEngine) return null;

  const games = CalendarEngine.getGamesForDate(dateStr, gameState);
  const event = CalendarEngine.getCalendarEvent(dateStr, gameState.seasonDates);
  const formattedDate = CalendarEngine.formatDateDisplay(dateStr);

  const allGames = [];
  const tierSchedules = [
    { schedule: games.tier1, tier: 1 },
    { schedule: games.tier2, tier: 2 },
    { schedule: games.tier3, tier: 3 },
  ];

  for (const { schedule, tier } of tierSchedules) {
    if (!schedule) continue;
    for (const game of schedule) {
      const home = allTeams.find(t => t.id === game.homeTeamId);
      const away = allTeams.find(t => t.id === game.awayTeamId);
      if (!home || !away) continue;
      allGames.push({
        ...game,
        homeName: home.city ? `${home.city} ${home.name}` : home.name,
        awayName: away.city ? `${away.city} ${away.name}` : away.name,
        tier,
      });
    }
  }

  const userGame = allGames.find(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId);
  const otherGames = allGames.filter(g => g.homeTeamId !== userTeamId && g.awayTeamId !== userTeamId);

  return { formattedDate, event, allGames, userGame, otherGames, dateStr };
}
