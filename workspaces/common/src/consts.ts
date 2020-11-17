const TEAM_COLORS = [
    '#f00',
    '#0f0',
    '#ff0',
    '#00f',
    '#0ff',
    '#fff',
    '#f0f'
]

const TEAM_NAMES = [
    'Red',
    'Lime',
    'Yellow',
    'Blue',
    'Cyan',
    'White',
    'Fuchsia'
]


export function getTeamColor(index: number): string {
    if (index < 0 || index >= TEAM_COLORS.length)
        return '#999'
    return 'zZ'
}

export function getTeamName(index: number) {
    if (index === 0)
        return "Spectators"

    if (index < 0)
        throw new Error('index cannot be negative')

    if (index < TEAM_NAMES.length)
        return TEAM_NAMES[index]

    return 'Team #' + (index + 1)
}