"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { InteractivePanel } from "@site/components/content/InteractivePanel";
import { isWidgetType, type WidgetType } from "./types";

// Each component receives the props validated against its catalogue schema at build time.
const widgetComponents: Record<WidgetType, ComponentType<any>> = {
  "b-plus-tree-lab": dynamic(() => import("./dis/BPlusTreeLab").then((module) => module.BPlusTreeLab)),
  "band-tuner": dynamic(() => import("./dis/BandTuner").then((module) => module.BandTuner)),
  "clustering-lab": dynamic(() => import("./dis/ClusteringLab").then((module) => module.ClusteringLab)),
  "clustering-threshold": dynamic(() => import("./dis/ClusteringThreshold").then((module) => module.ClusteringThreshold)),
  "cypher-shakespeare-lab": dynamic(() => import("./dis/CypherShakespeareLab").then((module) => module.CypherShakespeareLab)),
  "distance-lab": dynamic(() => import("./dis/DistanceLab").then((module) => module.DistanceLab)),
  "er-pipeline": dynamic(() => import("./dis/ErPipeline").then((module) => module.ErPipeline)),
  "extendible-hashing-lab": dynamic(() => import("./dis/ExtendibleHashingLab").then((module) => module.ExtendibleHashingLab)),
  "fragmentation-lab": dynamic(() => import("./dis/FragmentationLab").then((module) => module.FragmentationLab)),
  "greenplum-explorer": dynamic(() => import("./dis/GreenplumExplorer").then((module) => module.GreenplumExplorer)),
  "hash-spread-lab": dynamic(() => import("./dis/HashSpreadLab").then((module) => module.HashSpreadLab)),
  "join-strategy-explorer": dynamic(() => import("./dis/JoinStrategyExplorer").then((module) => module.JoinStrategyExplorer)),
  "lazy-evaluation-lab": dynamic(() => import("./dis/LazyEvaluationLab").then((module) => module.LazyEvaluationLab)),
  "map-reduce-lab": dynamic(() => import("./dis/MapReduceLab").then((module) => module.MapReduceLab)),
  "minhash-lab": dynamic(() => import("./dis/MinhashLab").then((module) => module.MinhashLab)),
  "pair-cost-calculator": dynamic(() => import("./dis/PairCostCalculator").then((module) => module.PairCostCalculator)),
  "quorum-lab": dynamic(() => import("./dis/QuorumLab").then((module) => module.QuorumLab)),
  "rdf-storage-lab": dynamic(() => import("./dis/RdfStorageLab").then((module) => module.RdfStorageLab)),
  "replica-placement-lab": dynamic(() => import("./dis/ReplicaPlacementLab").then((module) => module.ReplicaPlacementLab)),
  "replica-quorum-lab": dynamic(() => import("./dis/ReplicaQuorumLab").then((module) => module.ReplicaQuorumLab)),
  "semi-join-bloom-lab": dynamic(() => import("./dis/SemiJoinBloomLab").then((module) => module.SemiJoinBloomLab)),
  "shingling-explorer": dynamic(() => import("./dis/ShinglingExplorer").then((module) => module.ShinglingExplorer)),
  "string-similarity-lab": dynamic(() => import("./dis/StringSimilarityLab").then((module) => module.StringSimilarityLab)),
  "two-phase-commit-simulator": dynamic(() => import("./dis/TwoPhaseCommitSimulator").then((module) => module.TwoPhaseCommitSimulator)),
  "vector-search-lab": dynamic(() => import("./dis/VectorSearchLab").then((module) => module.VectorSearchLab)),
  "order-items": dynamic(() => import("./core/OrderItems").then((module) => module.OrderItems)),
  "match-pairs": dynamic(() => import("./core/MatchPairs").then((module) => module.MatchPairs)),
  categorize: dynamic(() => import("./core/Categorize").then((module) => module.Categorize)),
  cloze: dynamic(() => import("./core/Cloze").then((module) => module.Cloze)),
  "flow-stepper": dynamic(() => import("./core/FlowStepper").then((module) => module.FlowStepper)),
  "concept-map": dynamic(() => import("./core/ConceptMap").then((module) => module.ConceptMap)),
  chart: dynamic(() => import("./core/Chart").then((module) => module.Chart)),
  "parameter-explorer": dynamic(() => import("./core/ParameterExplorer").then((module) => module.ParameterExplorer)),
  "function-plot": dynamic(() => import("./core/FunctionPlot").then((module) => module.FunctionPlot)),
  "mock-exam": dynamic(() => import("./core/MockExam").then((module) => module.MockExam)),
};

interface WidgetHostProps {
  type: string;
  title?: string;
  description?: string;
  props?: Record<string, unknown>;
}

export function WidgetHost({ type, title, description, props }: WidgetHostProps) {
  if (!isWidgetType(type)) {
    return <p role="alert">Unknown widget &quot;{type}&quot;</p>;
  }

  const Widget = widgetComponents[type];
  return (
    <InteractivePanel title={title ?? type} description={description}>
      <Widget {...props} />
    </InteractivePanel>
  );
}
