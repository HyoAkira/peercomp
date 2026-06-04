type LoggerOptions = {
  logArgs?: boolean;
  logResult?: boolean;
  logTime?: boolean;
};

export default function LogClass() {
  return function (constructor: any) {
    for (const key of Object.getOwnPropertyNames(constructor.prototype)) {
      if (key === "constructor") continue;

      const descriptor = Object.getOwnPropertyDescriptor(
        constructor.prototype,
        key
      );

      if (!descriptor) continue;

      const original = descriptor.value;

      if (typeof original !== "function") continue;

      Object.defineProperty(constructor.prototype, key, {
        ...descriptor,

        value: function (...args: any[]) {
          console.log(`[CALL] ${key}`, args);

          const started = performance.now();

          try {
            const result = original.apply(this, args);

            if (result instanceof Promise) {
              return result.finally(() => {
                console.log(
                  `[DONE] ${key} ${(performance.now() - started).toFixed(2)}ms`
                );
              });
            }

            console.log(
              `[DONE] ${key} ${(performance.now() - started).toFixed(2)}ms`
            );

            return result;
          } catch (err) {
            console.error(`[ERROR] ${key}`, err);
            throw err;
          }
        },
      });
    }
  };
}
