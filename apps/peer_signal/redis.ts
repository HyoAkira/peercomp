import { createClient } from "redis";

const redis = createClient({
  url: "redis://default:[REDACTED_LOCAL_DEV_PASSWORD]@localhost:6379",
});

redis.on("error", (err) => console.log("Redis Client Error", err));

export default redis;
