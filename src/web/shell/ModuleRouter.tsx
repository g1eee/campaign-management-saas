/**
 * Maps the active ModuleId to its module component. Renders exactly one module.
 *
 * _Requirements: 3.3_
 */

import React from "react";
import { ModuleId } from "../../domain/types.js";
import { Dashboard } from "../modules/Dashboard.js";
import { Calendar } from "../modules/Calendar.js";
import { Board } from "../modules/Board.js";
import { Workflow } from "../modules/Workflow.js";
import { AdsCPAS, Banner, HostLive, IGStory } from "../modules/Assets.js";
import { Toko } from "../modules/Toko.js";
import {
  Laporan,
  MasterData,
  Notifikasi,
  Pengaturan,
  TugasSaya,
} from "../modules/Operations.js";

const MODULES: Record<ModuleId, React.ComponentType> = {
  Dashboard,
  Calendar,
  // Pivot: the primary "Campaign" view is the Papan_Campaign Kanban board.
  Campaign: Board,
  Workflow,
  Banner,
  Toko,
  IGStory,
  HostLive,
  AdsCPAS,
  TugasSaya,
  Notifikasi,
  Laporan,
  MasterData,
  Pengaturan,
};

export function ModuleRouter({ module }: { module: ModuleId }) {
  const Component = MODULES[module];
  return <Component />;
}
