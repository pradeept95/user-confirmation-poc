import { type IconType } from "@/components/icon/types";
import { type ReactNode } from "react";

type HeadingSize = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps {
  children: string | ReactNode;
  size: HeadingSize;
  fontSize?: HeadingSize;
  className?: string;
  icon?: IconType;
}

export type HeadingSizeMap = {
  [key in HeadingSize]: string;
};
