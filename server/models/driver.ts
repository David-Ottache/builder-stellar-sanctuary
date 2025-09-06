export interface DriverRecord {
  id: string;
  email?: string;
  phone: string;
  countryCode?: string;
  createdAt: string;
}

export function createDriver(input: { email?: string; phone: string; countryCode?: string }): DriverRecord {
  const id = `d${Math.floor(Math.random() * 100000)}`;
  const record: DriverRecord = {
    id,
    email: input.email,
    phone: input.phone,
    countryCode: input.countryCode,
    createdAt: new Date().toISOString(),
  };
  // NOTE: This is an in-memory placeholder. Replace with DB persistence.
  console.debug("createDriver", record);
  return record;
}
