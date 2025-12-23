import type { PaginatedResponse } from "../schemas.js";

class Cursor {
  constructor(
    public offset: number,
    public limit: number,
  ) {}
}

class HexDecoder {
  decode(value: string) {
    const bytes = new Uint8Array(value.length / 2);
    for (let i = 0; i < value.length; i += 2) {
      bytes[i / 2] = parseInt(value.substring(i, i + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  }
}

class HexEncoder {
  encode(buff: Uint8Array) {
    return Array.from(buff)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

class CursorDecoder {
  decode(cursor: string) {
    const hex = new HexDecoder().decode(cursor);
    const payload = JSON.parse(hex);
    return new Cursor(payload.offset, payload.limit);
  }
}

class CursorEncoder {
  encode(cursor: Cursor) {
    const json = new Uint8Array(
      new TextEncoder().encode(
        JSON.stringify({ offset: cursor.offset, limit: cursor.limit }),
      ),
    );
    return new HexEncoder().encode(json);
  }
}

export const offsetPaginable = async <T>(
  iterable: AsyncIterable<T> | Iterable<T>,
  options: { cursor: string } | { offset: number; limit: number },
): Promise<PaginatedResponse<T>> => {
  const cursor =
    "cursor" in options
      ? new CursorDecoder().decode(options.cursor)
      : new Cursor(options.offset, options.limit);
  const items: T[] = [];
  let index = 0;
  let hasMore = false;

  for await (const item of iterable) {
    if (index >= cursor.offset && index < cursor.offset + cursor.limit) {
      items.push(item);
    }
    index++;
    if (index === cursor.offset + cursor.limit + 1) {
      hasMore = true;
      break;
    }
  }

  return {
    next_cursor: hasMore
      ? new CursorEncoder().encode(
          new Cursor(cursor.offset + cursor.limit, cursor.limit),
        )
      : undefined,
    items,
  };
};
