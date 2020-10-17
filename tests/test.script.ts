function no_export() {
    "not-exported";
}

export function init() {
    no_export();
    "init";
}

export function update(dt: number) {
    const val = dt * 100;
    val * val;
}

export function exported() {
    "exported";
}
