import {MoveDirection} from "./dto";

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
    return index === 0 ? '#999' : TEAM_COLORS[index - 1] || '#999'
}

export function getTeamName(index: number) {
    if (index === 0)
        return "Spectators"

    if (index < 0)
        throw new Error('index cannot be negative')

    if (index < TEAM_NAMES.length + 1)
        return TEAM_NAMES[index - 1]

    return 'Team #' + (index + 1)
}

type Offsets = [number, number][]

const EVEN_X_INDEX_OFFSETS: Offsets = [
    [0, -1], // top
    [0, 1], // bottom
    [1, 0], // top right
    [-1, 0], // top left
    [1, 1], // bottom right
    [-1, 1], // bottom left
]

const ODD_X_INDEX_OFFSETS: Offsets = [
    [0, -1], // top
    [0, 1], // bottom
    [1, -1], // top right
    [-1, -1], // top left
    [1, 0], // bottom right
    [-1, 0], // bottom left
]

export const MapUtils = {
    getNeighbours(x: number, y: number) {
        return (x % 2 == 0 ? EVEN_X_INDEX_OFFSETS : ODD_X_INDEX_OFFSETS).map((v, index) => {
            return [
                v[0] + x,
                v[1] + y
            ]
        })
    },
    getNeighbour(x: number, y: number, direction: MoveDirection): [number, number] {
        const [xOff, yOff] = this.getOffset(x, direction)
        return [
            x + xOff,
            y + yOff
        ]
    },
    getOffset(x: number, direction: MoveDirection): [number, number] {
        return (x % 2 == 0 ? EVEN_X_INDEX_OFFSETS : ODD_X_INDEX_OFFSETS)[direction]
    }
}