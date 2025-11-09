import { createContext, useContext } from "react";

export type NodeConfigureHandler = (nodeId: string) => void;
export type NodeRenameHandler = (nodeId: string, displayLabel: string) => void;

export const NodeConfigureContext = createContext<NodeConfigureHandler | null>(null);
export const NodeRenameContext = createContext<NodeRenameHandler | null>(null);

export const useNodeConfigure = (): NodeConfigureHandler | null => useContext(NodeConfigureContext);
export const useNodeRename = (): NodeRenameHandler | null => useContext(NodeRenameContext);
