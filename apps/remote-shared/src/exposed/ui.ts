/**
 * @file ui.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (remote_shared/ui)
 * @description Module Federation './ui' 서브패스 공개 진입점입니다. 개별 분리된 13종 컴포넌트 및 clsx를 단일 창구로 노출합니다.
 */
export { clsx } from 'clsx';

export { Badge, type BadgeProps } from '../features/ui/components/Badge';
export { Button, type ButtonProps } from '../features/ui/components/Button';
export { Heading, type HeadingProps } from '../features/ui/components/Heading';
export {
  Select,
  type SelectOptionItem,
  type SelectProps,
} from '../features/ui/components/Select';
export { Skeleton, type SkeletonProps } from '../features/ui/components/Skeleton';

export { Card, type CardProps } from '../features/ui/layouts/Card';
export {
  Collapsible,
  type CollapsibleProps,
} from '../features/ui/layouts/Collapsible';
export { Container, type ContainerProps } from '../features/ui/layouts/Container';
export { Flex, type FlexProps } from '../features/ui/layouts/Flex';
export { Grid, type GridProps } from '../features/ui/layouts/Grid';
export {
  Splitter,
  type SplitterPanelItem,
  type SplitterProps,
} from '../features/ui/layouts/Splitter';
export { Stack, type StackProps } from '../features/ui/layouts/Stack';
export { type TabItem, Tabs, type TabsProps } from '../features/ui/layouts/Tabs';
