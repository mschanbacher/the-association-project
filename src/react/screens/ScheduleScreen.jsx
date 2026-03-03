import React, { useState, useMemo } from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { Card, CardHeader } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function ScheduleScreen() {
  const { gameState, engines, isReady } = useGame();

  if (!isReady || !gameState?.userTeam) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', color: 'var(--color-text-tertiary)',
      }}>
        Loading schedule…
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
    }}>
      {/* Calendar at top */}
      <EmbeddedCalendar gameState={gameState} engines={engines} />

      {/* Today's Games + Upcoming side by side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-5)',
        alignItems: 'start',
      }}>
        <TodaysGames gameState={gameState} engines={engines} />
        <UpcomingGames gameState={gameState} engines={engines} />
      </div>

      {/* Recent Results */}
      <RecentResults gameState={gameState} engines={engines} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Embedded Calendar
   ═══════════════════════════════════════════════════════════════ */
function EmbeddedCalendar({ gameState, engines }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const { CalendarEngine } = engines;

  const calData = useMemo(() => {
    const gs = gameState._raw || gameState;
    if (!gs?.currentDate || !CalendarEngine?.getSeasonDates) return null;

    const startYear = gs.seasonStartYear || 2025;
    const seasonDates = CalendarEngine.getSeasonDates(startYear);
    const months = [];
    for (let m = 9; m <= 11; m++) months.push({ year: startYear, month: m });
    for (let m = 0; m <= 3; m++) months.push({ year: startYear + 1, month: m });

    const userTeamId = gs.userTeamId;
    const userTier = gs.currentTier || 1;
    const userSchedule = userTier === 1 ? gs.tier1Schedule :
                         userTier === 2 ? gs.tier2Schedule : gs.tier3Schedule;
    const allTeams = [...(gs.tier1Teams || []), ...(gs.tier2Teams || []), ...(gs.tier3Teams || [])];

    const userGamesByDate = {};
    if (userSchedule) {
      userSchedule.forEach(game => {
        if (game.date && (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId)) {
          const isHome = game.homeTeamId === userTeamId;
          const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
          const opponent = allTeams.find(t => t.id === opponentId);
          userGamesByDate[game.date] = { isHome, opponent, played: game.played, game };
        }
      });
    }

    const allGamesByDate = {};
    [gs.tier1Schedule, gs.tier2Schedule, gs.tier3Schedule].forEach((sched, idx) => {
      if (!sched) return;
      sched.forEach(game => {
        if (game.date) {
          if (!allGamesByDate[game.date]) allGamesByDate[game.date] = { total: 0, t1: 0, t2: 0, t3: 0 };
          allGamesByDate[game.date].total++;
          if (idx === 0) allGamesByDate[game.date].t1++;
          else if (idx === 1) allGamesByDate[game.date].t2++;
          else allGamesByDate[game.date].t3++;
        }
      });
    });

    return {
      months, currentDate: gs.currentDate, userGamesByDate, allGamesByDate,
      seasonDates: {
        allStarStart: CalendarEngine.toDateString(seasonDates.allStarStart),
        allStarEnd: CalendarEngine.toDateString(seasonDates.allStarEnd),
        tradeDeadline: CalendarEngine.toDateString(seasonDates.tradeDeadline),
        tier1End: CalendarEngine.toDateString(seasonDates.tier1End),
      },
      startYear, allTeams, userTeamId, gameState: gs,
    };
  }, [gameState, engines]);

  const dayDetail = useMemo(() => {
    if (!selectedDate || !calData) return null;
    return buildDayDetail(selectedDate, calData.gameState, calData.allTeams, calData.userTeamId);
  }, [selectedDate, calData]);

  if (!calData) return null;

  const { months, currentDate, userGamesByDate, allGamesByDate, seasonDates, startYear } = calData;
  const { allStarStart, allStarEnd, tradeDeadline, tier1End } = seasonDates;

  return (
    <Card padding="lg" className="animate-slide-up">
      <CardHeader>
        📅 Season {startYear}-{(startYear + 1) % 100} Calendar
      </CardHeader>

      <div style={{
        display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap',
        marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)',
        color: 'var(--color-text-secondary)',
      }}>
        <LegendItem color="rgba(102,126,234,0.6)" label="Home Game" />
        <LegendItem color="rgba(234,67,53,0.5)" label="Away Game" />
        <LegendItem color="var(--color-bg-active)" label="League Games" border />
        <LegendItem color="rgba(255,215,0,0.3)" label="Special Event" />
        <LegendItem color="transparent" label="Today" todayBorder />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        {months.map(({ year, month }) => (
          <MonthCard key={`${year}-${month}`}
            year={year} month={month} currentDate={currentDate}
            userGamesByDate={userGamesByDate} allGamesByDate={allGamesByDate}
            allStarStart={allStarStart} allStarEnd={allStarEnd}
            tradeDeadline={tradeDeadline} tier1End={tier1End}
            selectedDate={selectedDate} onSelectDate={setSelectedDate}
          />
        ))}
      </div>

      {dayDetail && (
        <DayDetailPanel
          detail={dayDetail}
          userTeamId={calData.userTeamId}
          onShowBoxScore={(date, homeId, awayId) => window.showBoxScore?.(date, homeId, awayId)}
        />
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Calendar Sub-Components
   ═══════════════════════════════════════════════════════════════ */
function LegendItem({ color, label, border, todayBorder }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: 14, height: 14, borderRadius: 3, display: 'inline-block',
        background: color,
        border: todayBorder ? '2px solid #ffd700' : border ? '1px solid var(--color-border-subtle)' : 'none',
      }} />
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
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div style={{
      background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3)', border: '1px solid var(--color-border-subtle)',
    }}>
      <div style={{
        textAlign: 'center', fontWeight: 'var(--weight-semi)',
        fontSize: 'var(--text-sm)', color: 'var(--color-warning)',
        marginBottom: 'var(--space-2)',
      }}>
        {MONTH_NAMES[month]} {year}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2, textAlign: 'center',
      }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', padding: '2px 0' }}>{d}</div>
        ))}
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(day => {
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
  const hasContent = userGame || (dayGames && dayGames.total > 0);

  let bg = 'transparent';
  let textColor = 'var(--color-text-tertiary)';
  let dotText = '';

  if (userGame) {
    bg = userGame.isHome
      ? (userGame.played ? 'rgba(102,126,234,0.35)' : 'rgba(102,126,234,0.6)')
      : (userGame.played ? 'rgba(234,67,53,0.3)' : 'rgba(234,67,53,0.5)');
    textColor = 'var(--color-text)';
    const oppName = userGame.opponent ? userGame.opponent.name.split(' ').pop() : '???';
    dotText = `${userGame.isHome ? 'vs' : '@'} ${oppName}`;
  } else if (dayGames && dayGames.total > 0) {
    bg = 'var(--color-bg-active)';
    textColor = 'var(--color-text-secondary)';
    dotText = `${dayGames.total}g`;
  }

  if (isSpecial) {
    bg = 'rgba(255,215,0,0.15)';
    textColor = '#ffd700';
    dotText = isAllStar ? '⭐' : isTradeDeadline ? 'TDL' : 'END';
  }

  return (
    <div
      onClick={hasContent ? () => onClick(dateStr) : undefined}
      style={{
        background: isSelected ? 'var(--color-accent)30' : bg,
        borderRadius: 4, padding: '3px 1px', minHeight: 36,
        color: textColor,
        border: isToday ? '2px solid #ffd700' : isSelected ? '1px solid var(--color-accent)' : 'none',
        cursor: hasContent ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ fontSize: '0.8em', fontWeight: isToday ? 'var(--weight-bold)' : 'var(--weight-normal)' }}>{day}</div>
      {dotText && (
        <div style={{
          fontSize: '0.5em', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', opacity: 0.85, marginTop: 1,
        }}>{dotText}</div>
      )}
    </div>
  );
}

function DayDetailPanel({ detail, userTeamId, onShowBoxScore }) {
  const { formattedDate, event, userGame, otherGames, dateStr } = detail;

  return (
    <div style={{
      marginTop: 'var(--space-4)', background: 'var(--color-bg-sunken)',
      borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
      border: '1px solid var(--color-border-subtle)',
    }}>
      <div style={{
        fontWeight: 'var(--weight-semi)', color: 'var(--color-warning)',
        marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)',
      }}>
        {formattedDate}
      </div>

      {event && (
        <div style={{
          marginBottom: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)',
          background: 'rgba(255,215,0,0.1)', borderRadius: 'var(--radius-md)',
          color: '#ffd700', fontSize: 'var(--text-sm)',
        }}>{event}</div>
      )}

      {!userGame && otherGames.length === 0 && (
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>No games scheduled</div>
      )}

      {userGame && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-1)', color: 'var(--color-text-secondary)' }}>
            🏀 Your Game
          </div>
          <CalGameRow game={userGame} userTeamId={userTeamId} dateStr={dateStr} onShowBoxScore={onShowBoxScore} highlight />
        </div>
      )}

      {otherGames.length > 0 && (
        <details style={{ marginTop: 'var(--space-1)' }}>
          <summary style={{
            cursor: 'pointer', color: 'var(--color-text-tertiary)',
            fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)',
          }}>
            {otherGames.length} other game{otherGames.length !== 1 ? 's' : ''} today
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', maxHeight: 300, overflowY: 'auto' }}>
            {otherGames.map((g, i) => (
              <CalGameRow key={i} game={g} userTeamId={userTeamId} dateStr={dateStr} onShowBoxScore={onShowBoxScore} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function CalGameRow({ game, userTeamId, dateStr, onShowBoxScore, highlight }) {
  const bg = highlight ? 'rgba(102,126,234,0.12)' : 'var(--color-bg-active)';

  if (!game.played) {
    return (
      <div style={{
        background: bg, padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)', opacity: 0.6, fontSize: 'var(--text-sm)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{game.homeName} vs {game.awayName}</span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>Upcoming</span>
      </div>
    );
  }

  const homeWon = game.homeScore > game.awayScore;
  return (
    <div
      onClick={game.played ? () => onShowBoxScore(dateStr, game.homeTeamId, game.awayTeamId) : undefined}
      style={{
        background: bg, padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)', cursor: game.played ? 'pointer' : 'default',
        fontSize: 'var(--text-sm)',
        border: highlight ? '1px solid rgba(102,126,234,0.25)' : '1px solid var(--color-border-subtle)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontWeight: homeWon ? 'var(--weight-semi)' : 'var(--weight-normal)', opacity: homeWon ? 1 : 0.6 }}>{game.homeName}</span>
        <span style={{ fontWeight: homeWon ? 'var(--weight-semi)' : 'var(--weight-normal)', opacity: homeWon ? 1 : 0.6 }}>{game.homeScore}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: !homeWon ? 'var(--weight-semi)' : 'var(--weight-normal)', opacity: !homeWon ? 1 : 0.6 }}>{game.awayName}</span>
        <span style={{ fontWeight: !homeWon ? 'var(--weight-semi)' : 'var(--weight-normal)', opacity: !homeWon ? 1 : 0.6 }}>{game.awayScore}</span>
      </div>
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
  for (const { schedule, tier } of [
    { schedule: games.tier1, tier: 1 },
    { schedule: games.tier2, tier: 2 },
    { schedule: games.tier3, tier: 3 },
  ]) {
    if (!schedule) continue;
    for (const game of schedule) {
      const home = allTeams.find(t => t.id === game.homeTeamId);
      const away = allTeams.find(t => t.id === game.awayTeamId);
      if (!home || !away) continue;
      allGames.push({ ...game, homeName: home.name, awayName: away.name, tier });
    }
  }

  const userGame = allGames.find(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId);
  const otherGames = allGames.filter(g => g.homeTeamId !== userTeamId && g.awayTeamId !== userTeamId);

  return { formattedDate, event, allGames, userGame, otherGames, dateStr };
}

/* ═══════════════════════════════════════════════════════════════
   Today's Games Panel
   ═══════════════════════════════════════════════════════════════ */
function TodaysGames({ gameState, engines }) {
  const { CalendarEngine } = engines;
  const { currentDate, currentTier, userTeam } = gameState;

  const todaysData = useMemo(() => {
    if (!currentDate || !CalendarEngine?.getGamesForDate) return null;
    return CalendarEngine.getGamesForDate(currentDate, gameState._raw || gameState);
  }, [currentDate, CalendarEngine, gameState]);

  if (!todaysData) return null;

  const tierGames = currentTier === 1 ? todaysData.tier1 :
                    currentTier === 2 ? todaysData.tier2 : todaysData.tier3;
  const unplayed = (tierGames || []).filter(g => !g.played);

  const teams = currentTier === 1 ? gameState.tier1Teams :
                currentTier === 2 ? gameState.tier2Teams : gameState.tier3Teams;

  const dateStr = CalendarEngine?.formatDateShort
    ? CalendarEngine.formatDateShort(currentDate)
    : currentDate;

  const otherTiers = [];
  if (currentTier !== 1) {
    const c = (todaysData.tier1 || []).filter(g => !g.played).length;
    if (c > 0) otherTiers.push({ tier: 1, count: c });
  }
  if (currentTier !== 2) {
    const c = (todaysData.tier2 || []).filter(g => !g.played).length;
    if (c > 0) otherTiers.push({ tier: 2, count: c });
  }
  if (currentTier !== 3) {
    const c = (todaysData.tier3 || []).filter(g => !g.played).length;
    if (c > 0) otherTiers.push({ tier: 3, count: c });
  }

  return (
    <Card padding="lg" className="animate-slide-up">
      <CardHeader action={
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>{dateStr}</span>
      }>
        Today's Games
      </CardHeader>

      {unplayed.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--space-6) 0',
          color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)',
        }}>
          No games scheduled today
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {unplayed.slice(0, 8).map((game, i) => {
            const home = teams.find(t => t.id === game.homeTeamId);
            const away = teams.find(t => t.id === game.awayTeamId);
            const isUserGame = game.homeTeamId === userTeam.id || game.awayTeamId === userTeam.id;
            return (
              <ScheduleGameRow key={i} home={home} away={away} isUserGame={isUserGame} />
            );
          })}
          {unplayed.length > 8 && (
            <div style={{
              textAlign: 'center', fontSize: 'var(--text-sm)',
              color: 'var(--color-text-tertiary)', paddingTop: 'var(--space-2)',
            }}>
              +{unplayed.length - 8} more games
            </div>
          )}
        </div>
      )}

      {otherTiers.length > 0 && (
        <div style={{
          marginTop: 'var(--space-3)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border-subtle)',
          display: 'flex', gap: 'var(--space-3)', justifyContent: 'center',
        }}>
          {otherTiers.map(({ tier, count }) => (
            <span key={tier} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              T{tier}: {count} games
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Upcoming User Games
   ═══════════════════════════════════════════════════════════════ */
function UpcomingGames({ gameState, engines }) {
  const { CalendarEngine } = engines;
  const { currentDate, currentTier, userTeam } = gameState;

  const teams = currentTier === 1 ? gameState.tier1Teams :
                currentTier === 2 ? gameState.tier2Teams : gameState.tier3Teams;

  const schedule = currentTier === 1 ? (gameState._raw?.tier1Schedule || []) :
                   currentTier === 2 ? (gameState._raw?.tier2Schedule || []) :
                                       (gameState._raw?.tier3Schedule || []);

  const upcoming = useMemo(() => {
    if (!schedule || !currentDate) return [];
    return schedule.filter(g =>
      !g.played &&
      g.date >= currentDate &&
      (g.homeTeamId === userTeam.id || g.awayTeamId === userTeam.id)
    ).slice(0, 10);
  }, [schedule, currentDate, userTeam.id]);

  return (
    <Card padding="lg" className="animate-slide-up">
      <CardHeader>Upcoming Games</CardHeader>

      {upcoming.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--space-6) 0',
          color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)',
        }}>
          Season complete!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {upcoming.map((game, i) => {
            const home = teams.find(t => t.id === game.homeTeamId);
            const away = teams.find(t => t.id === game.awayTeamId);
            const isHome = game.homeTeamId === userTeam.id;
            const dateStr = CalendarEngine?.formatDateShort
              ? CalendarEngine.formatDateShort(game.date) : game.date;

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: i === 0 ? 'var(--color-accent-light)' : 'transparent',
                border: i === 0 ? '1px solid var(--color-accent-subtle)' : '1px solid transparent',
              }}>
                <span style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                  minWidth: 60, fontVariantNumeric: 'tabular-nums',
                }}>{dateStr}</span>
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semi)',
                  color: isHome ? 'var(--color-win)' : 'var(--color-info)',
                  width: 36, textAlign: 'center',
                }}>{isHome ? 'HOME' : 'AWAY'}</span>
                <span style={{
                  flex: 1, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
                }}>
                  vs {isHome ? (away ? away.name : '?') : (home ? home.name : '?')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Recent Results
   ═══════════════════════════════════════════════════════════════ */
function RecentResults({ gameState, engines }) {
  const { currentTier, userTeam } = gameState;
  const { CalendarEngine } = engines;

  const teams = currentTier === 1 ? gameState.tier1Teams :
                currentTier === 2 ? gameState.tier2Teams : gameState.tier3Teams;

  const schedule = currentTier === 1 ? (gameState._raw?.tier1Schedule || []) :
                   currentTier === 2 ? (gameState._raw?.tier2Schedule || []) :
                                       (gameState._raw?.tier3Schedule || []);

  const recentGames = useMemo(() => {
    if (!schedule) return [];
    return schedule.filter(g =>
      g.played &&
      (g.homeTeamId === userTeam.id || g.awayTeamId === userTeam.id)
    ).slice(-10).reverse();
  }, [schedule, userTeam.id]);

  if (recentGames.length === 0) return null;

  return (
    <Card padding="lg" className="animate-slide-up">
      <CardHeader>Recent Results</CardHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {recentGames.map((game, i) => {
          const home = teams.find(t => t.id === game.homeTeamId);
          const away = teams.find(t => t.id === game.awayTeamId);
          const isHome = game.homeTeamId === userTeam.id;
          const userScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;
          const won = userScore > oppScore;
          const opponent = isHome ? away : home;
          const dateStr = CalendarEngine?.formatDateShort
            ? CalendarEngine.formatDateShort(game.date) : (game.date || '');
          const hasBox = !!game.boxScore;

          return (
            <div key={i}
              onClick={() => { if (game.played && game.date) window.showBoxScore?.(game.date, game.homeTeamId, game.awayTeamId); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                cursor: game.played ? 'pointer' : 'default',
                transition: 'background var(--duration-fast) ease',
              }}
              onMouseEnter={e => { if (game.played) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', minWidth: 60, fontVariantNumeric: 'tabular-nums' }}>{dateStr}</span>
              <Badge variant={won ? 'win' : 'loss'}>{won ? 'W' : 'L'}</Badge>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)', minWidth: 56 }}>{userScore}–{oppScore}</span>
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                {isHome ? 'vs' : '@'} {opponent ? opponent.name : '?'}
              </span>
              {hasBox && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', opacity: 0.6 }}>📊</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Schedule Game Row (for Today's Games)
   ═══════════════════════════════════════════════════════════════ */
function ScheduleGameRow({ home, away, isUserGame }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: 'var(--space-2) var(--space-3)',
      borderRadius: 'var(--radius-md)',
      background: isUserGame ? 'var(--color-accent-light)' : 'var(--color-bg-sunken)',
      border: isUserGame ? '1px solid var(--color-accent-subtle)' : '1px solid var(--color-border-subtle)',
      gap: 'var(--space-3)',
    }}>
      <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', textAlign: 'right' }}>
        {away ? away.name : '?'}
      </span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontWeight: 'var(--weight-semi)', padding: '2px 8px' }}>@</span>
      <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
        {home ? home.name : '?'}
      </span>
      {isUserGame && <Badge variant="accent" style={{ flexShrink: 0 }}>You</Badge>}
    </div>
  );
}
