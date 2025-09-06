export interface DriverRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  countryCode?: string;
  gender?: string;
  location?: string;
  profilePhoto?: string;
  driverLicenseNumber?: string;
  driverLicensePhoto?: string;
  vehicleType?: string;
  createdAt: string;
}

export function createDriver(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  countryCode?: string;
  gender?: string;
  location?: string;
  profilePhoto?: string;
  driverLicenseNumber?: string;
  driverLicensePhoto?: string;
  vehicleType?: string;
}): DriverRecord {
  const id = `d${Math.floor(Math.random() * 100000)}`;
  const record: DriverRecord = {
    id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    countryCode: input.countryCode,
    gender: input.gender,
    location: input.location,
    profilePhoto: input.profilePhoto,
    driverLicenseNumber: input.driverLicenseNumber,
    driverLicensePhoto: input.driverLicensePhoto,
    vehicleType: input.vehicleType,
    createdAt: new Date().toISOString(),
  };
  // NOTE: This is an in-memory placeholder. Replace with DB persistence.
  // Log only defined properties to avoid noisy undefined values in logs
  try {
    const logged = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
    console.debug("createDriver", logged);
  } catch {
    console.debug("createDriver", record);
  }
  return record;
}
