// Dados de demonstração (usados só quando o back-end está offline).
const svg = (text, bg) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="18" fill="${bg}"/><text x="50%" y="55%" font-family="Arial Black,Arial" font-size="${text.length > 3 ? 26 : 32}" font-weight="900" fill="#0b0e14" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`
  )}`;

export const mockAvatar = (nick) => svg(nick.slice(0, 2).toUpperCase(), '#38bdf8');

const T = (id, name, tag, color) => ({ id, name, tag, logo: svg(tag, color) });
export const MOCK_TEAMS = [
  T(1, 'Imperial Academy', 'IMP', '#de9b35'), T(2, 'FURIA Academy', 'FUR', '#e6e9f0'),
  T(3, 'Legacy Next', 'LGC', '#38bdf8'), T(4, 'Falcons BR', 'FLC', '#34d399'),
  T(5, 'Vitality Rising', 'VIT', '#facc15'), T(6, 'Spirit Hunters', 'SPR', '#a78bfa'),
  T(7, 'MOUZ Next', 'MOZ', '#f87171'), T(8, 'Aurora Gaming', 'AUR', '#2dd4bf'),
];
const team = (id) => MOCK_TEAMS.find((t) => t.id === id);

const ROLE_SET = ['IGL', 'AWPer', 'Entry Fragger', 'Rifler', 'Support'];
const lineup = (tag) => ROLE_SET.map((role, i) => {
  const nickname = `${tag.toLowerCase()}_${['mind', 'sniper', 'entry', 'aim', 'sup'][i]}`;
  return { userId: 100 + i, nickname, role, avatar: mockAvatar(nickname) };
});

export const MOCK_TROPHY = (id, tournament, icon, color, trophyName, date, format = '') =>
  ({ id, kind: 'CHAMPION', tournament, icon, color, trophyName, date, format });

const BASE = {
  banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
};

export const MOCK_TOURNAMENTS = [
  { id: 1, templateId: 'gsl-playoffs', format: 'GSL', title: 'Copa GSL Pro Series #1', roomNumber: 1,
    type: 'Grupos GSL (MD3) + Mata-Mata', status: 'Em Andamento', statusCode: 'RUNNING', currentTeams: 8, maxTeams: 8,
    startDate: 'Em jogo agora', banner: BASE.banner,
    trophy: { name: 'Taça GSL Pro Series', icon: 'trophy', color: '#de9b35' },
    rules: 'Dois grupos de 4 em formato GSL (MD3). Os 2 melhores de cada grupo avançam aos Playoffs (Semifinais MD3 e Grande Final MD5). Torneio gratuito: vale prestígio e troféu exclusivo.' },
  { id: 2, templateId: 'swiss-playoffs', format: 'SWISS', title: 'Major Swiss Qualifier #1', roomNumber: 1,
    type: 'Sistema Suíço (3 Vitórias) + Mata-Mata', status: 'Inscrições Abertas', statusCode: 'REGISTRATION',
    currentTeams: 15, maxTeams: 16, startDate: 'Inicia ao lotar',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    trophy: { name: 'Coroa Major Swiss', icon: 'crown', color: '#38bdf8' },
    rules: 'Fase Suíça com 16 equipes: 3 vitórias classificam, 3 derrotas eliminam (decisivas em MD3). Os 8 classificados jogam mata-mata. Torneio gratuito: vale prestígio e troféu exclusivo.' },
  { id: 3, templateId: 'round-robin-playoffs', format: 'ROUND_ROBIN', title: 'Liga Pontos Corridos #1', roomNumber: 1,
    type: 'Grupos Pontos Corridos + Mata-Mata', status: 'Inscrições Abertas', statusCode: 'REGISTRATION',
    currentTeams: 10, maxTeams: 12, startDate: 'Inicia ao lotar',
    banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    trophy: { name: 'Escudo da Liga', icon: 'shield', color: '#a78bfa' },
    rules: '2 grupos de 6 equipes, todos contra todos (MD3). Os 4 melhores de cada grupo avançam aos Playoffs. Torneio gratuito: vale prestígio e troféu exclusivo.' },
];

let mid = 1;
const M = (stage, roundLabel, roundNumber, group, bo, t1, t2, s1 = 0, s2 = 0, status = 'FINISHED') => ({
  id: mid++, tournamentId: 1, stage, roundLabel, roundNumber, groupName: group, bo,
  team1: t1 ? team(t1) : null, team2: t2 ? team(t2) : null, score1: s1, score2: s2,
  winnerId: status === 'FINISHED' ? (s1 > s2 ? t1 : t2) : null, status,
});

const GSL_MATCHES = [
  M('GROUP', 'Abertura', 1, 'A', 3, 1, 4, 2, 0), M('GROUP', 'Abertura', 1, 'A', 3, 2, 3, 2, 1),
  M('GROUP', 'Final dos Vencedores', 2, 'A', 3, 1, 2, 2, 1), M('GROUP', 'Eliminação', 2, 'A', 3, 4, 3, 0, 2),
  M('GROUP', 'Decisiva', 3, 'A', 3, 2, 3, 2, 0),
  M('GROUP', 'Abertura', 1, 'B', 3, 5, 8, 2, 1), M('GROUP', 'Abertura', 1, 'B', 3, 6, 7, 0, 2),
  M('GROUP', 'Final dos Vencedores', 2, 'B', 3, 5, 7, 1, 2), M('GROUP', 'Eliminação', 2, 'B', 3, 8, 6, 2, 0),
  M('GROUP', 'Decisiva', 3, 'B', 3, 5, 8, 2, 1),
  M('PLAYOFF', 'Semifinal', 1, null, 3, 1, 5, 2, 1), M('PLAYOFF', 'Semifinal', 1, null, 3, 7, 2, 0, 2),
  M('PLAYOFF', 'Grande Final', 2, null, 5, 1, 2, 0, 0, 'READY'),
];

export const MOCK_MATCHES = GSL_MATCHES;

export const mockTournamentDetail = (t) => ({
  ...t,
  registrations: MOCK_TEAMS.map((tm, i) => ({ teamId: tm.id, name: tm.name, tag: tm.tag, logo: tm.logo,
    seed: i + 1, group: i < 4 ? 'A' : 'B', lineup: lineup(tm.tag) })),
  matches: t.format === 'GSL' ? GSL_MATCHES : t.format === 'SWISS' ? [
    M('SWISS', 'Rodada 1', 1, null, 1, 1, 5, 1, 0), M('SWISS', 'Rodada 1', 1, null, 3, 2, 6, 1, 0),
    M('SWISS', 'Rodada 1', 1, null, 4, 3, 7, 0, 1), M('SWISS', 'Rodada 1', 1, null, 5, 4, 8, 1, 0),
    M('SWISS', 'Rodada 2', 2, null, 1, 1, 2, 0, 0, 'READY'), M('SWISS', 'Rodada 2', 2, null, 3, 7, 4, 0, 0, 'READY'),
  ] : [
    M('GROUP', 'Rodada 1', 1, 'A', 3, 1, 2, 2, 0), M('GROUP', 'Rodada 1', 1, 'A', 3, 3, 4, 1, 2),
    M('GROUP', 'Rodada 2', 2, 'A', 3, 1, 3, 2, 1), M('GROUP', 'Rodada 2', 2, 'A', 3, 2, 4, 0, 0, 'READY'),
  ],
});

export const MOCK_PLAYER = {
  id: 1, nickname: 'fallen_fan', steamId64: '76561198000000000', avatar: mockAvatar('fallen_fan'), role: 'AWPer',
  level: 18, lookingForTeam: false, team: team(1), isCaptain: true,
  stats: { matches: 142, winRate: '58.4%', kdRatio: '1.24', hsPercentage: '47.8%' },
  trophies: [
    MOCK_TROPHY(1, 'Copa GSL Pro Series #1', 'trophy', '#de9b35', 'Taça GSL Pro Series', 'Nov 2026', 'Grupos GSL (MD3) + Mata-Mata'),
    MOCK_TROPHY(2, 'Liga Pontos Corridos #1', 'shield', '#a78bfa', 'Escudo da Liga', 'Out 2026', 'Grupos Pontos Corridos'),
    MOCK_TROPHY(3, 'Major Swiss Qualifier #1', 'crown', '#38bdf8', 'Coroa Major Swiss', 'Set 2026', 'Sistema Suíço (3 Vitórias)'),
  ],
  mvps: [
    { id: 11, kind: 'MVP', tournament: 'Copa GSL Pro Series #1', date: 'Nov 2026', icon: 'trophy', color: '#de9b35' },
    { id: 12, kind: 'MVP', tournament: 'Liga Pontos Corridos #1', date: 'Out 2026', icon: 'shield', color: '#a78bfa' },
  ],
  matchHistory: [
    { id: 1, tournament: 'Copa GSL Pro Series #1', format: 'GSL', map: 'Mirage', score: '13 - 9', result: 'Vitória', kda: '24 / 14 / 5', date: '10/11 21:40' },
    { id: 2, tournament: 'Copa GSL Pro Series #1', format: 'GSL', map: 'Inferno', score: '11 - 13', result: 'Derrota', kda: '18 / 17 / 3', date: '10/11 20:55' },
  ],
};

export const MOCK_TEAM = {
  id: 1, name: 'Imperial Academy', tag: 'IMP', logo: team(1).logo, description: 'Time competitivo focado em torneios abertos. Treinos de segunda a sexta, a partir das 20h.',
  captainId: 1, lookingForPlayers: true, openRoles: ['Support', 'Lurker'],
  stats: { matches: 28, wins: 18, titles: 2, winRate: '64.2%' },
  trophies: MOCK_PLAYER.trophies.slice(0, 2),
  members: [
    { id: 1, userId: 1, nickname: 'fallen_fan', role: 'AWPer', isCaptain: true, isStarter: true, avatar: mockAvatar('fallen_fan'), kdRatio: 1.24, mvpCount: 2 },
    { id: 2, userId: 2, nickname: 'kscerato_aim', role: 'Rifler', isCaptain: false, isStarter: true, avatar: mockAvatar('kscerato_aim'), kdRatio: 1.18, mvpCount: 1 },
    { id: 3, userId: 3, nickname: 'art_rush', role: 'Entry Fragger', isCaptain: false, isStarter: true, avatar: mockAvatar('art_rush'), kdRatio: 1.05, mvpCount: 0 },
    { id: 4, userId: 4, nickname: 'yuurih_smoke', role: 'Support', isCaptain: false, isStarter: true, avatar: mockAvatar('yuurih_smoke'), kdRatio: 0.98, mvpCount: 0 },
    { id: 5, userId: 5, nickname: 'chelo_igl', role: 'IGL', isCaptain: false, isStarter: true, avatar: mockAvatar('chelo_igl'), kdRatio: 0.92, mvpCount: 0 },
  ],
};

export const MOCK_LFT = [
  { id: 21, nickname: 'zeca_awp', role: 'AWPer', level: 17, kdRatio: '1.31', avatar: mockAvatar('zeca_awp') },
  { id: 22, nickname: 'lurk_god', role: 'Lurker', level: 14, kdRatio: '1.12', avatar: mockAvatar('lurk_god') },
  { id: 23, nickname: 'entry_boy', role: 'Entry Fragger', level: 16, kdRatio: '1.08', avatar: mockAvatar('entry_boy') },
  { id: 24, nickname: 'suporte_br', role: 'Support', level: 12, kdRatio: '0.95', avatar: mockAvatar('suporte_br') },
];

export const MOCK_LFP = [
  { ...team(1), description: 'Procuramos Support e Lurker para fechar o elenco.', openRoles: ['Support', 'Lurker'], members: 5, captainId: 1 },
  { ...team(3), description: 'Time em ascensão, precisa de um AWPer.', openRoles: ['AWPer'], members: 4, captainId: 31 },
  { ...team(6), description: 'Buscamos IGL experiente.', openRoles: ['IGL', 'Rifler'], members: 3, captainId: 61 },
];

export const MOCK_MATCH_ROOM = (id) => ({
  match: { id: Number(id) || 101, tournamentId: 1, stage: 'PLAYOFF', roundLabel: 'Grande Final', bo: 3, status: 'READY',
    team1: team(1), team2: team(2), score1: 0, score2: 0, winnerId: null, mapResults: [], maps: [], pendingResult: null },
  captains: { 1: 1, 2: 2 },
  rosters: { 1: lineup('IMP'), 2: lineup('FUR') },
});
