import { Types } from 'mongoose';

export function resolveVariantId(variant: unknown): Types.ObjectId | undefined {
  if (!variant) {
    return undefined;
  }

  if (variant instanceof Types.ObjectId) {
    return variant;
  }

  if (typeof variant === 'string') {
    return Types.ObjectId.isValid(variant)
      ? new Types.ObjectId(variant)
      : undefined;
  }

  if (typeof variant === 'object') {
    const candidate = (variant as any)?._id ?? variant;

    if (candidate instanceof Types.ObjectId) {
      return candidate;
    }

    if (typeof candidate === 'string') {
      return Types.ObjectId.isValid(candidate)
        ? new Types.ObjectId(candidate)
        : undefined;
    }

    if (typeof candidate?.toString === 'function') {
      const serialized = candidate.toString();
      return Types.ObjectId.isValid(serialized)
        ? new Types.ObjectId(serialized)
        : undefined;
    }
  }

  return undefined;
}
