export interface UserRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  countryCode?: string;
  gender?: string;
  location?: string;
  profilePhoto?: string;
  identificationNumber?: string;
  identificationPhoto?: string;
  // server side fields
  passwordHash?: string;
  otpCode?: string;
  otpExpires?: string;
  createdAt: string;
}

export function createUser(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  countryCode?: string;
  gender?: string;
  location?: string;
  profilePhoto?: string;
  identificationNumber?: string;
  identificationPhoto?: string;
  passwordHash?: string;
  otpCode?: string;
  otpExpires?: string;
}): UserRecord {
  const id = `u${Math.floor(Math.random() * 100000)}`;
  const record: UserRecord = {
    id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    countryCode: input.countryCode,
    gender: input.gender,
    location: input.location,
    profilePhoto: input.profilePhoto,
    identificationNumber: input.identificationNumber,
    identificationPhoto: input.identificationPhoto,
    passwordHash: input.passwordHash,
    otpCode: input.otpCode,
    otpExpires: input.otpExpires,
    createdAt: new Date().toISOString(),
  };
  try {
    const logged = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined && v !== record.passwordHash && v !== record.otpCode));
    console.debug("createUser", logged);
  } catch {
    console.debug("createUser", record);
  }
  return record;
}
