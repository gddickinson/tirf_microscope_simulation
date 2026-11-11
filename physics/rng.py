"""Seeded random numbers that match the web engine exactly: Mulberry32 (core.js rng), Box-Muller normals and a
Poisson sampler (Knuth below 30, rounded normal approximation above). Integer maths is done modulo 2**32."""
import math

M32 = 0xFFFFFFFF


def _imul(a, b):
    return (a * b) & M32


def mulberry32(seed=1):
    """Return a function giving uniform floats in [0, 1), the same sequence as core.js rng(seed)."""
    state = [seed & M32]

    def rand():
        a = (state[0] + 0x6D2B79F5) & M32
        state[0] = a
        t = _imul(a ^ (a >> 15), 1 | a)
        t = ((t + _imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296.0
    return rand


def normal(rand):
    """One standard normal sample (Box-Muller, cosine branch; uses two uniforms)."""
    u1 = 1.0 - rand()
    u2 = rand()
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)


def poisson(lam, rand):
    """Poisson sample with mean lam (Knuth's method below 30, else round(lam + sqrt(lam) * N(0, 1)) clipped at 0)."""
    if lam <= 0:
        return 0
    if lam < 30:
        limit = math.exp(-lam)
        k, p = 0, 1.0
        while True:
            k += 1
            p *= rand()
            if p <= limit:
                return k - 1
    return max(0, math.floor(lam + math.sqrt(lam) * normal(rand) + 0.5))
