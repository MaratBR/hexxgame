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

const EVEN_Y_INDEX_OFFSETS: Offsets = [
    [0, -1], // top left
    [1, -1], // top right
    [1, 0], // right
    [1, 1], // bottom right
    [0, 1], // bottom left
    [-1, 0], // left
]

const ODD_Y_INDEX_OFFSETS: Offsets = [
    [-1, -1], // top left
    [0, -1], // top right
    [1, 0], // right
    [0, 1], // bottom right
    [-1, 1], // bottom left
    [-1, 0], // left
]

export const MapUtils = {
    getNeighbours(x: number, y: number) {
        return (y % 2 == 0 ? EVEN_Y_INDEX_OFFSETS : ODD_Y_INDEX_OFFSETS).map((v, index) => {
            return [
                v[0] + x,
                v[1] + y
            ]
        })
    },
    getNeighbour(x: number, y: number, direction: MoveDirection): [number, number] {
        const [xOff, yOff] = this.getOffset(y, direction)
        return [
            x + xOff,
            y + yOff
        ]
    },
    getOffset(y: number, direction: MoveDirection): [number, number] {
        return (y % 2 == 0 ? EVEN_Y_INDEX_OFFSETS : ODD_Y_INDEX_OFFSETS)[direction]
    },
    getKey(x: number, y: number): string { return y + ':' + x },
}