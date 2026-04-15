import { Configuration, PlaidApi, PlaidEnvironments, Products } from "plaid";

const PRODUCTS_MAP = {
  transactions: Products.Transactions,
  auth: Products.Auth,
  identity: Products.Identity,
  investments: Products.Investments,
  liabilities: Products.Liabilities,
  signal: Products.Signal,
  transfer: Products.Transfer,
};

function parseProducts(rawProducts) {
  return rawProducts
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => PRODUCTS_MAP[value])
    .filter(Boolean);
}

export function createPlaidClient(config) {
  const plaidConfig = new Configuration({
    basePath: PlaidEnvironments[config.PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": config.PLAID_CLIENT_ID,
        "PLAID-SECRET": config.PLAID_SECRET,
      },
    },
  });

  return new PlaidApi(plaidConfig);
}

export function getPlaidLinkConfig(config) {
  return {
    products: parseProducts(config.PLAID_PRODUCTS),
    countryCodes: config.PLAID_COUNTRY_CODES.split(",").map((value) => value.trim()),
  };
}
