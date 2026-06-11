import type { FlashListProps } from "@shopify/flash-list";
import React from "react";
import { FlatList, type FlatListProps } from "react-native";

/**
 * FlashList v1 depends on native `AutoLayoutView`. That fails on web and can
 * fail on native (e.g. dev client built without FlashList, or bridge mismatch)
 * with "View config not found for component 'AutoLayoutView'".
 *
 * This component keeps the FlashList props type but always renders FlatList
 * (ignoring `estimatedItemSize`). Lists stay stable; revisit FlashList v2 or a
 * rebuilt native binary if you need recycling perf on very large lists.
 */
export function PlatformFlashList<T>(props: FlashListProps<T>): React.ReactElement {
  const { estimatedItemSize: _estimatedItemSize, ...rest } = props;
  return <FlatList<T> {...(rest as FlatListProps<T>)} />;
}
