/**
 * Template endpoints.
 *
 * Wires the pure Template_Campaign domain module (validateTemplate, instantiate)
 * to persistence and the access-control middleware. SPV saves reusable
 * templates; Admin creates Campaigns from them. All mutating operations are
 * guarded server-side by `authorize`, so a denied request changes no data.
 *
 * `save` validates the draft (exactly one category, 1..50 promo options,
 * 1..1000 target stores) before persisting (Requirements 7.1, 7.2, 7.3).
 * `createFrom` rejects when the template has been deleted from the repository
 * (Requirement 7.6), re-validates the stored content (Requirement 7.7), and on
 * success persists a new Campaign that is a deep, independent copy of the
 * template at status Menunggu (Requirements 7.4, 7.5).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
 */

import {
  Campaign,
  CampaignTemplate,
  EpochMillis,
  Principal,
} from "../domain/types.js";
import {
  instantiate,
  TemplateDraft,
  validateTemplate,
} from "../domain/template.js";
import { Repositories } from "../infra/db/repositories.js";
import { authorize } from "./middleware/accessControl.js";
import { ApiResult } from "./campaign.js";

export class TemplateService {
  constructor(private readonly repos: Repositories) {}

  /**
   * SPV saves a Template_Campaign (Requirements 7.1, 7.2, 7.3).
   *
   * Validates the draft via the pure domain module; on a constraint violation
   * the failure reason is surfaced and no template is persisted. On success the
   * stamped template is upserted into the repository and returned.
   */
  save(
    role: Principal,
    draft: TemplateDraft,
    now: EpochMillis,
  ): ApiResult<CampaignTemplate> {
    return authorize(role, "CreateTemplate", () => {
      const result = validateTemplate(draft, now);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      const template = this.repos.templates.upsert(result.template);
      return { ok: true, value: template };
    });
  }

  /**
   * Admin creates a Campaign from a stored Template_Campaign
   * (Requirements 7.4, 7.5, 7.6, 7.7).
   *
   * Rejects when the template is no longer present in the repository — i.e. it
   * has been deleted (Requirement 7.6). When present, defers to the domain
   * module which re-validates the content (Requirement 7.7) and produces a deep
   * independent copy at status Menunggu (Requirements 7.4, 7.5); the new
   * Campaign is then persisted.
   */
  createFrom(
    role: Principal,
    templateId: string,
    now: EpochMillis,
  ): ApiResult<Campaign> {
    return authorize(role, "CreateCampaign", () => {
      const template = this.repos.templates.get(templateId);
      if (!template) {
        return { ok: false, reason: "Template tidak lagi tersedia." };
      }
      const result = instantiate(template, now);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      const campaign = this.repos.campaigns.upsert(result.campaign);
      return { ok: true, value: campaign };
    });
  }
}
