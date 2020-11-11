function try_return() {
    return "not-exported";
}

export function init() {
    if (true) return try_return();
}

export function update(dt: number) {
    const val = dt * 100;
    val * val;
}

export function exported() {
    "exported";
}