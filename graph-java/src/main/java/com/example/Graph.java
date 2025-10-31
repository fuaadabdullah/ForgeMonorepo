
package com.example;

import java.util.*;

public class Graph {
    private final Map<Node, List<Node>> adjNodes = new HashMap<>();

    public void addNode(Node node) {
        Objects.requireNonNull(node, "Node cannot be null.");
        adjNodes.putIfAbsent(node, new ArrayList<>());
    }

    public void removeNode(Node node) {
        Objects.requireNonNull(node, "Node cannot be null.");
        adjNodes.values().forEach(list -> list.remove(node));
        adjNodes.remove(node);
    }

    public void addEdge(Node node1, Node node2) {
        Objects.requireNonNull(node1, "Nodes cannot be null.");
        Objects.requireNonNull(node2, "Nodes cannot be null.");
        adjNodes.computeIfAbsent(node1, k -> new ArrayList<>()).add(node2);
        adjNodes.computeIfAbsent(node2, k -> new ArrayList<>()); // Ensure the second node is in the graph
    }

    public void removeEdge(Node node1, Node node2) {
        Objects.requireNonNull(node1, "Nodes cannot be null.");
        Objects.requireNonNull(node2, "Nodes cannot be null.");
        List<Node> neighbors = adjNodes.get(node1);
        if (neighbors != null) {
            neighbors.remove(node2);
        }
    }

    public List<Node> getAdjNodes(Node node) {
        Objects.requireNonNull(node, "Node cannot be null.");
        List<Node> neighbors = adjNodes.get(node);
        if (neighbors == null) {
            return Collections.emptyList();
        }
        return Collections.unmodifiableList(neighbors);
    }

    public Set<Node> getNodes() {
        return Collections.unmodifiableSet(adjNodes.keySet());
    }
}
