import { createPlaidClient, getPlaidLinkConfig } from "../plaidClient.js";
import { runtimeConfig } from "./env.js";

export const plaidClient = createPlaidClient(runtimeConfig);
export const plaidLinkConfig = getPlaidLinkConfig(runtimeConfig);
