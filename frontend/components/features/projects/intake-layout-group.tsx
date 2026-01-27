"use client";

import { LayoutGroup } from "framer-motion";
import type { ReactNode } from "react";

export function IntakeLayoutGroup({ children }: { children: ReactNode }) {
	return <LayoutGroup>{children}</LayoutGroup>;
}
