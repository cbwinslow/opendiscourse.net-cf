// Database service for storing ingested data in D1

export class DatabaseService {
  private db: any; // D1Database

  constructor(db: any) {
    this.db = db;
  }

  // Store a govinfo package
  async storeGovInfoPackage(pkg: any): Promise<void> {
    try {
      // Insert main package record
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO govinfo_packages (
          id, package_id, title, category, date_issued, last_modified, 
          collection_code, congress, type, number, volume, session, 
          associated_date, granules_link, previous_link, next_link, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          pkg.packageId,
          pkg.packageId,
          pkg.title,
          pkg.category,
          pkg.dateIssued,
          pkg.lastModified,
          pkg.collectionCode,
          pkg.congress,
          pkg.type,
          pkg.number,
          pkg.volume,
          pkg.session,
          pkg.associatedDate,
          pkg.granulesLink,
          pkg.previousLink,
          pkg.nextLink,
          new Date().toISOString(),
          new Date().toISOString(),
        )
        .run();

      // Insert metadata
      if (pkg.metadata) {
        for (const [key, value] of Object.entries(pkg.metadata)) {
          await this.db
            .prepare(
              `INSERT OR REPLACE INTO govinfo_package_metadata (package_id, key, value) VALUES (?, ?, ?)`,
            )
            .bind(pkg.packageId, key, String(value))
            .run();
        }
      }

      // Insert identifiers
      if (pkg.identifiers) {
        for (const identifier of pkg.identifiers) {
          await this.db
            .prepare(
              `INSERT OR REPLACE INTO govinfo_package_identifiers (package_id, type, value) VALUES (?, ?, ?)`,
            )
            .bind(pkg.packageId, identifier.type, identifier.value)
            .run();
        }
      }

      // Insert downloads
      if (pkg.downloads) {
        for (const download of pkg.downloads) {
          await this.db
            .prepare(
              `INSERT OR REPLACE INTO govinfo_package_downloads (package_id, type, url, size) VALUES (?, ?, ?, ?)`,
            )
            .bind(pkg.packageId, download.type, download.url, download.size)
            .run();
        }
      }

      console.log(`Stored govinfo package ${pkg.packageId}`);
    } catch (error) {
      console.error(`Error storing govinfo package ${pkg.packageId}:`, error);
      throw error;
    }
  }

  // Store a congress bill
  async storeCongressBill(bill: any): Promise<void> {
    try {
      // Insert main bill record
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO congress_bills (
          id, bill_id, title, congress, type, number, introduced_date,
          sponsor_title, sponsor_name, sponsor_state, sponsor_party,
          cosponsors_count, committees, latest_action_date, latest_action,
          xml_url, pdf_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          bill.billId,
          bill.billId,
          bill.title,
          bill.congress,
          bill.type,
          bill.number,
          bill.introducedDate,
          bill.sponsor?.title,
          bill.sponsor?.name,
          bill.sponsor?.state,
          bill.sponsor?.party,
          bill.cosponsorsCount,
          JSON.stringify(bill.committees),
          bill.latestAction?.actionDate,
          bill.latestAction?.text,
          bill.xmlUrl,
          bill.pdfUrl,
          new Date().toISOString(),
          new Date().toISOString(),
        )
        .run();

      // Insert subjects
      if (bill.subjects) {
        for (const subject of bill.subjects) {
          await this.db
            .prepare(
              `INSERT OR REPLACE INTO congress_bill_subjects (bill_id, subject) VALUES (?, ?)`,
            )
            .bind(bill.billId, subject.name)
            .run();
        }
      }

      // Insert summaries
      if (bill.summaries) {
        for (const summary of bill.summaries) {
          await this.db
            .prepare(
              `INSERT OR REPLACE INTO congress_bill_summaries (
              bill_id, version, action_date, action_desc, summary_text
            ) VALUES (?, ?, ?, ?, ?)`,
            )
            .bind(
              bill.billId,
              summary.version,
              summary.actionDate,
              summary.actionDesc,
              summary.text,
            )
            .run();
        }
      }

      // Insert actions
      if (bill.actions) {
        for (const action of bill.actions) {
          await this.db
            .prepare(
              `INSERT OR REPLACE INTO congress_bill_actions (
              bill_id, action_date, action_type, action_name, action_stage, action_text
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              bill.billId,
              action.actionDate,
              action.actionType,
              action.actionName,
              action.actionStage,
              action.text,
            )
            .run();
        }
      }

      // Insert cosponsors
      if (bill.cosponsors) {
        for (const cosponsor of bill.cosponsors) {
          await this.db
            .prepare(
              `INSERT OR REPLACE INTO congress_bill_cosponsors (
              bill_id, cosponsor_name, cosponsor_state, cosponsor_party, cosponsor_date
            ) VALUES (?, ?, ?, ?, ?)`,
            )
            .bind(
              bill.billId,
              cosponsor.name,
              cosponsor.state,
              cosponsor.party,
              cosponsor.date,
            )
            .run();
        }
      }

      console.log(`Stored congress bill ${bill.billId}`);
    } catch (error) {
      console.error(`Error storing congress bill ${bill.billId}:`, error);
      throw error;
    }
  }

  // Store a member of Congress
  async storeCongressMember(member: any): Promise<void> {
    try {
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO congress_members (
          id, member_id, first_name, last_name, full_name, state, party,
          chamber, district, start_date, end_date, phone, fax, website,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          member.memberId,
          member.memberId,
          member.firstName,
          member.lastName,
          member.fullName,
          member.state,
          member.party,
          member.chamber,
          member.district,
          member.startDate,
          member.endDate,
          member.phone,
          member.fax,
          member.website,
          new Date().toISOString(),
          new Date().toISOString(),
        )
        .run();

      console.log(`Stored congress member ${member.memberId}`);
    } catch (error) {
      console.error(`Error storing congress member ${member.memberId}:`, error);
      throw error;
    }
  }

  // Store a committee
  async storeCongressCommittee(committee: any): Promise<void> {
    try {
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO congress_committees (
          id, committee_id, name, chamber, parent_committee_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          committee.committeeId,
          committee.committeeId,
          committee.name,
          committee.chamber,
          committee.parentCommitteeId,
          new Date().toISOString(),
          new Date().toISOString(),
        )
        .run();

      console.log(`Stored congress committee ${committee.committeeId}`);
    } catch (error) {
      console.error(
        `Error storing congress committee ${committee.committeeId}:`,
        error,
      );
      throw error;
    }
  }
}
