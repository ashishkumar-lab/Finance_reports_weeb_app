import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { driveuQueryLong, logDownload } from "@/lib/db";
import { hasReportPermission } from "@/lib/userDb";
import { generateExcel } from "@/lib/excel";

const B2B_REVENUE_QUERY = `
SELECT
    tariff_city.name AS City,
    b.booking_id,
    CONCAT(d.first_name,'',d.last_name) AS Driver_Name,
    b.driver_id AS Driver_Id,
    e1.value AS Client_ID,
    e2.value AS Vehicle_Number,
    affiliate_organisation.name AS Client_Name,
    b.pickup_address,
    b.drop_address,
    app_bookingsummary.booking_type,
    e3.value AS trip_category,
    DATE_FORMAT(b.created_at, '%d-%m-%Y %r') AS booking_created_at,
    DATE_FORMAT(b.pickup_datetime, '%d-%m-%Y %r') AS pickup_datetime,
    DATE_FORMAT(app_bookingsummary.driver_reached_at, '%d-%m-%Y %r') AS driver_reached_at,
    CASE
        WHEN TIMESTAMPDIFF(MINUTE, app_bookingsummary.driver_reached_at, b.pickup_datetime) < 0
        THEN TIMESTAMPDIFF(MINUTE, b.pickup_datetime, app_bookingsummary.driver_reached_at)
    END AS Delay_Time,
    DATE_FORMAT(cl.created_at, '%d-%m-%Y %r') AS Pickup_Checklist_Time,
    DATE_FORMAT(app_bookingsummary.trip_started_at, '%d-%m-%Y %r') AS trip_started_at,
    CASE
        WHEN DATE(dl.created_at) >= '2020-03-11'
        THEN DATE_FORMAT(dl.created_at, '%d-%m-%Y %r')
        ELSE DATE_FORMAT(app_bookingsummary.trip_ended_at, '%d-%m-%Y %r')
    END AS Drop_Checklist_Time,
    DATE_FORMAT(app_bookingsummary.trip_ended_at, '%d-%m-%Y %r') AS trip_ended_at,
    f.trip_time,
    f.actual_distance AS Distance_Travel,
    f.estimated_distance AS Est_Distance_Travel,
    CASE
        WHEN TIMESTAMPDIFF(MINUTE, b.created_at, b.pickup_datetime) >= 120
        THEN 'Normal Request'
        ELSE 'Special Request'
    END AS Booking_request,
    affiliate_organisation.insurance_coverage,
    CASE
        WHEN affiliate_organisation.id IN (
            4, 7, 51, 86, 88, 111, 137, 151, 153, 154, 155, 157, 158, 159, 161, 162, 163, 164,
            165, 166, 167, 168, 169, 170, 172, 173, 174, 175, 177, 180, 181, 182, 183, 185, 186,
            187, 189, 191, 192, 193, 194, 195, 196, 198, 199, 200, 201, 203, 204, 205, 206, 207,
            208, 209, 210, 211, 212, 214, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226,
            227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 242, 243, 244, 245,
            246, 247, 249, 250, 251, 252, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264,
            265, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 278, 279, 280, 281, 282, 283,
            284, 287, 288, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303,
            304, 306, 307, 308, 310, 311, 312, 313, 319, 320, 321, 322, 323, 324, 325, 326, 327,
            328, 329, 330, 331, 332, 333, 334, 335, 337, 338, 339, 340, 341, 342, 343, 344, 345,
            346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362,
            363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379,
            380, 382, 384, 385, 386, 387, 388, 389, 390, 391, 393, 394, 395, 396, 397, 398, 400,
            401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417,
            418, 419, 420, 421, 423, 424, 425, 426, 427, 431, 433, 435, 436, 437, 438, 442, 443,
            444, 445, 446, 447, 450, 453, 454, 455, 457, 458, 459, 460, 461, 462, 463, 464, 465,
            466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482,
            483, 484, 485, 486, 487, 488, 489, 491, 492, 493, 494, 495, 496, 497, 499, 500, 501,
            502, 503, 504, 505, 506, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 519, 520,
            521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 535, 537, 538, 539,
            540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 557, 558, 559,
            560, 561, 562, 563, 383, 439, 381, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573,
            574, 575, 576, 577, 578, 579, 580, 581, 582, 588, 589, 590, 591, 592, 593, 594, 595,
            596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 611, 612, 613,
            614, 615, 616, 617, 618, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 634,
            635, 638, 639, 640, 642, 643, 644, 645, 646, 647, 648, 649, 650, 651, 652, 654, 655,
            656, 657, 658, 659, 660, 661, 662, 663, 664
        ) THEN 'Yes'
        ELSE 'No'
    END AS insurance_applicable,
    f.fare AS Base_Fare,
    f.extra_charges AS Extra_Charges,
    f.night_charges AS Night_Charges,
    (f.fare + f.extra_charges + f.night_charges) AS Total_Fare,
    (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) AS Driver_Fare,
    ((f.fare + f.extra_charges + f.night_charges) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)) AS Convenience_Fee,
    f.premium_amount AS Trip_Secure_Fee,
    0.18 * ((f.fare + f.extra_charges + f.night_charges) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) + f.premium_amount) AS GST_Conv_TripSec_Fee,
    ((f.fare + f.extra_charges + f.night_charges) + f.premium_amount + 0.18 * ((f.fare + f.extra_charges + f.night_charges) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) + f.premium_amount)) AS Payable,
    app_bookingsummary.instructions

FROM app_booking b

JOIN app_bookingsummary ON b.id = app_bookingsummary.booking_id

JOIN app_bookingfare f ON f.booking_id = b.id

LEFT JOIN settlements_driverearning sde ON sde.booking_id = b.id

LEFT OUTER JOIN driver_driver d ON b.driver_id = d.id

JOIN tariff_city ON b.city_id = tariff_city.id

JOIN affiliate_organisation ON b.organisation_id = affiliate_organisation.id

LEFT OUTER JOIN app_bookingextra e1
    ON b.id = e1.booking_id AND e1.key_name = 'client_booking_id'

LEFT OUTER JOIN app_bookingextra e2
    ON b.id = e2.booking_id AND e2.key_name = 'vehicle_registration_number'

LEFT OUTER JOIN app_bookingextra e3
    ON b.id = e3.booking_id AND e3.key_name = 'trip_category'

LEFT OUTER JOIN app_b2bactionlog cl
    ON cl.booking_id = b.id AND cl.action = 'start-pickup-du-checklist'

LEFT OUTER JOIN app_b2bactionlog dl
    ON dl.booking_id = b.id AND dl.action = 'end-drop-du-checklist'

WHERE b.is_b2b = 1
AND DATE(b.pickup_datetime) BETWEEN ? AND ?
AND b.status = 5

GROUP BY b.booking_id
ORDER BY b.pickup_datetime
`;

const COLUMNS = [
  { header: "City",                      key: "City",                    width: 16 },
  { header: "Booking ID",                key: "booking_id",              width: 22 },
  { header: "Driver Name",               key: "Driver_Name",             width: 22 },
  { header: "Driver ID",                 key: "Driver_Id",               width: 14 },
  { header: "Client ID",                 key: "Client_ID",               width: 16 },
  { header: "Vehicle Number",            key: "Vehicle_Number",          width: 18 },
  { header: "Client Name",               key: "Client_Name",             width: 24 },
  { header: "Pickup Address",            key: "pickup_address",          width: 32 },
  { header: "Drop Address",              key: "drop_address",            width: 32 },
  { header: "Booking Type",              key: "booking_type",            width: 18 },
  { header: "Trip Category",             key: "trip_category",           width: 16 },
  { header: "Booking Created At",        key: "booking_created_at",      width: 22 },
  { header: "Pickup Datetime",           key: "pickup_datetime",         width: 22 },
  { header: "Driver Reached At",         key: "driver_reached_at",       width: 22 },
  { header: "Delay Time (min)",          key: "Delay_Time",              width: 16 },
  { header: "Pickup Checklist Time",     key: "Pickup_Checklist_Time",   width: 24 },
  { header: "Trip Started At",           key: "trip_started_at",         width: 22 },
  { header: "Drop Checklist Time",       key: "Drop_Checklist_Time",     width: 24 },
  { header: "Trip Ended At",             key: "trip_ended_at",           width: 22 },
  { header: "Trip Time",                 key: "trip_time",               width: 14 },
  { header: "Distance Travel",           key: "Distance_Travel",         width: 18 },
  { header: "Est. Distance Travel",      key: "Est_Distance_Travel",     width: 20 },
  { header: "Booking Request",           key: "Booking_request",         width: 18 },
  { header: "Insurance Coverage",        key: "insurance_coverage",      width: 20 },
  { header: "Insurance Applicable",      key: "insurance_applicable",    width: 20 },
  { header: "Base Fare",                 key: "Base_Fare",               width: 14 },
  { header: "Extra Charges",             key: "Extra_Charges",           width: 16 },
  { header: "Night Charges",             key: "Night_Charges",           width: 16 },
  { header: "Total Fare",                key: "Total_Fare",              width: 14 },
  { header: "Driver Fare",               key: "Driver_Fare",             width: 14 },
  { header: "Convenience Fee",           key: "Convenience_Fee",         width: 18 },
  { header: "Trip Secure Fee",           key: "Trip_Secure_Fee",         width: 18 },
  { header: "GST on Conv. & Trip Sec",   key: "GST_Conv_TripSec_Fee",    width: 24 },
  { header: "Payable",                   key: "Payable",                 width: 14 },
  { header: "Instructions",              key: "instructions",            width: 30 },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    if (!session.user.dbUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allowed = await hasReportPermission(session.user.dbUserId, "b2b-revenue");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  }
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  try {
    const rows = await driveuQueryLong<Record<string, unknown>>(
      B2B_REVENUE_QUERY,
      [startDate, endDate]
    );

    if (rows.length > 1048575) {
      return NextResponse.json(
        { error: `Too many records (${rows.length.toLocaleString()}). Exceeds Excel's maximum row limit of 1,048,575.` },
        { status: 400 }
      );
    }

    const buffer = await generateExcel("B2B Revenue", COLUMNS, rows);
    await logDownload("B2B Revenue Report", startDate, endDate, session.user?.email ?? "unknown");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="b2b_revenue_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[B2B Revenue] Error:", err);
    await logDownload("B2B Revenue Report", startDate!, endDate!, session.user?.email ?? "unknown", "error");
    return NextResponse.json(
      { error: "Failed to generate report. Check server logs." },
      { status: 500 }
    );
  }
}
