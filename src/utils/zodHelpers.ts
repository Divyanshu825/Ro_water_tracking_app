import { z } from 'zod';

/** Numeric text input: required, numeric and >= min. Stays a string so inputs stay controlled. */
export const numStr = (label: string, min = 0, opts: { integer?: boolean; required?: boolean } = {}) =>
  z.string().refine((v) => (v.trim() === '' ? opts.required === false : true), `${label} is required`)
    .refine((v) => v.trim() === '' || !Number.isNaN(Number(v)), `${label} must be a number`)
    .refine((v) => v.trim() === '' || Number(v) >= min, `${label} must be at least ${min}`)
    .refine((v) => v.trim() === '' || !opts.integer || Number.isInteger(Number(v)), `${label} must be a whole number`);

export const phoneStr = z.string().trim().regex(/^[+\d][\d\s-]{6,15}$/, 'Enter a valid mobile number');
