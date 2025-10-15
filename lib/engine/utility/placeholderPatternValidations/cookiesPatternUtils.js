// .foo=bar;path=/;secure   OR   foo="a;b=c\"d" ; SameSite=None
const COOKIE_SET_HEAD_RE = /^(?:\.)?(?<name>[^=;]+)=(?<value>"(?:[^"\\]|\\.)*"|[^;]*)(?:;(?<rest>.*))?$/i;
const COOKIE_KEY_RE = /^(?:\.)?(?<name>[^=;]+)$/;

export const parseCookieGetOrRemoveTail = (tail) => {
    const m = COOKIE_KEY_RE.exec(tail.trim());
    return m?.groups?.name?.trim() ?? null;
};

export const parseCookieSetTail = (tail) => {
    const m = COOKIE_SET_HEAD_RE.exec(tail.trim());
    if (!m?.groups) return null;

    const name = m.groups.name.trim();
    const rawVal = unquoteMaybe(m.groups.value);
    const value = decodeMaybeURI(rawVal);

    const options = parseOptions(m.groups.rest);
    return { name, value, options };
};

const splitSemicolons = (input) => {
    const out = [];
    let buf = "",
        inQuote = false,
        esc = false;
    for (const char of input) {
        if (esc) {
            buf += char;
            esc = false;
            continue;
        }
        if (char === "\\") {
            buf += char;
            esc = true;
            continue;
        }
        if (char === '"') {
            inQuote = !inQuote;
            buf += char;
            continue;
        }
        if (char === ";" && !inQuote) {
            out.push(buf.trim());
            buf = "";
            continue;
        }
        buf += char;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
};

const unquoteMaybe = (s) => {
    s = s.trim();
    if (s.startsWith('"') && s.endsWith('"')) {
        return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    return s;
};

const decodeMaybeURI = (s) => {
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
};

const parseOptions = (rest) => {
    const opt = { raw: {} };
    if (!rest) return opt;
    for (const part of splitSemicolons(rest)) {
        if (!part) continue;
        const [kRaw, ...vParts] = part.split("=");
        const key = kRaw.trim().toLowerCase();
        const vRaw = vParts.length ? vParts.join("=").trim() : undefined;
        const v = vRaw !== undefined ? unquoteMaybe(vRaw) : undefined;

        switch (key) {
            case "path":
                opt.path = v ?? "/";
                break;
            case "domain":
                opt.domain = v ?? undefined;
                break;
            case "samesite": {
                const s = (v ?? "").toLowerCase();
                if (s === "lax" || s === "strict" || s === "none") {
                    opt.sameSite = s[0].toUpperCase() + s.slice(1);
                }
                break;
            }
            case "secure":
                opt.secure = true;
                break;
            // following option is no-op in client side rendering, useful if the lib is used by a server side framework
            case "httponly":
                opt.httpOnly = true;
                break;
            case "max-age": {
                const n = Number(v);
                if (Number.isFinite(n)) opt.maxAge = n;
                break;
            }
            case "expires": {
                const d = v ? new Date(v) : undefined;
                if (d && !Number.isNaN(d.getTime())) opt.expires = d;
                break;
            }
            default:
                opt.raw[key] = v ?? true;
        }
    }
    return opt;
};
