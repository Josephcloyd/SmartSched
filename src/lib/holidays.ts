import type { HolidayCalendar, PublicHoliday } from "@/lib/types";

type ReverseGeocodeResponse = {
  countryCode?: string;
  countryName?: string;
  principalSubdivisionCode?: string;
  principalSubdivision?: string;
};

type HolidayApiRecord = {
  date?: string;
  name?: string;
  countryCode?: string;
  subdivisionCodes?: string[] | null;
  holidayTypes?: string[];
};

export type DetectedHolidayLocation = {
  countryCode: string;
  countryName: string;
  subdivisionCode: string;
  subdivisionName: string;
};

export const popularCountries = [
  { code: "PH", name: "Philippines" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "GB", name: "United Kingdom" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "KR", name: "South Korea" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "NZ", name: "New Zealand" },
] as const;

export const defaultHolidayCalendar: HolidayCalendar = {
  enabled: true,
  countryCode: "",
  countryName: "",
  subdivisionCode: "",
  subdivisionName: "",
  lastUpdated: "",
  holidays: [],
  customBreaks: [],
};

export function normalizeHolidayCalendar(
  value?: Partial<HolidayCalendar>,
): HolidayCalendar {
  const holidays = Array.isArray(value?.holidays)
    ? value.holidays
        .filter(
          (holiday): holiday is PublicHoliday =>
            typeof holiday?.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(holiday.date) &&
            typeof holiday?.name === "string",
        )
        .map((holiday) => ({
          date: holiday.date,
          name: holiday.name.trim() || "Public holiday",
          countryCode: String(holiday.countryCode || value?.countryCode || "")
            .trim()
            .toUpperCase(),
        }))
    : [];

  const customBreaks = Array.isArray(value?.customBreaks)
    ? value.customBreaks
        .filter(
          (b) =>
            typeof b?.id === "string" &&
            typeof b?.name === "string" &&
            typeof b?.startDate === "string" &&
            typeof b?.endDate === "string",
        )
        .map((b) => ({
          id: b.id,
          name: b.name.trim() || "School Break",
          startDate: b.startDate,
          endDate: b.endDate,
        }))
    : [];

  return {
    enabled: value?.enabled !== false,
    countryCode: String(value?.countryCode || "").trim().toUpperCase().slice(0, 2),
    countryName: String(value?.countryName || "").trim(),
    subdivisionCode: String(value?.subdivisionCode || "").trim().toUpperCase(),
    subdivisionName: String(value?.subdivisionName || "").trim(),
    lastUpdated: String(value?.lastUpdated || ""),
    holidays,
    customBreaks,
  };
}

export function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function holidayForDate(calendar: HolidayCalendar, date: Date) {
  if (!calendar.enabled) {
    return undefined;
  }

  const dateKey = formatLocalDateKey(date);
  const publicHoliday = calendar.holidays.find((holiday) => holiday.date === dateKey);
  if (publicHoliday) {
    return publicHoliday;
  }

  const customBreak = calendar.customBreaks?.find(
    (b) => dateKey >= b.startDate && dateKey <= b.endDate,
  );
  if (customBreak) {
    return {
      date: dateKey,
      name: customBreak.name,
      countryCode: calendar.countryCode || "LOCAL",
    };
  }

  return undefined;
}

export function upcomingHolidays(calendar: HolidayCalendar, limit = 4) {
  const today = formatLocalDateKey(new Date());
  return calendar.holidays
    .filter((holiday) => holiday.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function holidayCalendarNeedsRefresh(calendar: HolidayCalendar) {
  if (!calendar.countryCode) {
    return false;
  }

  const currentYear = String(new Date().getFullYear());
  const hasCurrentYear = calendar.holidays.some((holiday) =>
    holiday.date.startsWith(currentYear),
  );
  const updatedAt = Date.parse(calendar.lastUpdated);
  const isStale =
    !Number.isFinite(updatedAt) || Date.now() - updatedAt > 30 * 24 * 60 * 60 * 1000;

  return !hasCurrentYear || isStale;
}

export async function detectHolidayLocation(): Promise<DetectedHolidayLocation> {
  if (!("geolocation" in navigator)) {
    throw new Error("Location detection is not supported by this browser.");
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 60 * 60 * 1000,
      timeout: 12000,
    });
  });

  const query = new URLSearchParams({
    latitude: String(position.coords.latitude),
    longitude: String(position.coords.longitude),
    localityLanguage: "en",
  });
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`,
  );
  if (!response.ok) {
    throw new Error("Your country could not be identified from this location.");
  }

  const location = (await response.json()) as ReverseGeocodeResponse;
  const countryCode = String(location.countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error("Your country could not be identified from this location.");
  }

  return {
    countryCode,
    countryName: String(location.countryName || countryCode).replace(/ \(the\)$/i, ""),
    subdivisionCode: String(location.principalSubdivisionCode || "")
      .trim()
      .toUpperCase(),
    subdivisionName: String(location.principalSubdivision || "").trim(),
  };
}

export async function fetchPublicHolidays(
  countryCode: string,
  subdivisionCode = "",
): Promise<PublicHoliday[]> {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  const results = await Promise.all(
    years.map(async (year) => {
      const response = await fetch(
        `https://date.nager.at/api/v4/Holidays/${encodeURIComponent(countryCode)}/${year}`,
      );
      if (!response.ok) {
        throw new Error(`Holiday dates are unavailable for ${countryCode}.`);
      }
      return (await response.json()) as HolidayApiRecord[];
    }),
  );

  const normalizedSubdivision = subdivisionCode.toUpperCase();
  const holidays = results
    .flat()
    .filter((holiday) => holiday.holidayTypes?.includes("Public"))
    .filter((holiday) => {
      const subdivisions = Array.isArray(holiday.subdivisionCodes)
        ? holiday.subdivisionCodes.map((code) => code.toUpperCase())
        : [];
      return (
        subdivisions.length === 0 ||
        (Boolean(normalizedSubdivision) && subdivisions.includes(normalizedSubdivision))
      );
    })
    .filter(
      (holiday) =>
        typeof holiday.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(holiday.date) &&
        typeof holiday.name === "string",
    )
    .map((holiday) => ({
      date: holiday.date as string,
      name: (holiday.name as string).trim() || "Public holiday",
      countryCode: String(holiday.countryCode || countryCode).toUpperCase(),
    }));

  return Array.from(
    new Map(holidays.map((holiday) => [`${holiday.date}:${holiday.name}`, holiday])).values(),
  ).sort((a, b) => a.date.localeCompare(b.date));
}
