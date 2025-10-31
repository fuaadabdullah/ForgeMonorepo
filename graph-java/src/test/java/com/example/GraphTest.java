
package com.example;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GraphTest {

    private Graph graph;
    private Node nodeA;
    private Node nodeB;
    private Node nodeC;

    @BeforeEach
    void setUp() {
        graph = new Graph();
        nodeA = new Node("A");
        nodeB = new Node("B");
        nodeC = new Node("C");
        graph.addNode(nodeA);
        graph.addNode(nodeB);
        graph.addNode(nodeC);
    }

    @Test
    void addNode_nullNode_throwsNullPointerException() {
        assertThrows(NullPointerException.class, () -> graph.addNode(null));
    }

    @Test
    void addEdge_nullNode_throwsNullPointerException() {
        assertThrows(NullPointerException.class, () -> graph.addEdge(nodeA, null));
        assertThrows(NullPointerException.class, () -> graph.addEdge(null, nodeB));
    }

    @Test
    void getAdjNodes_nonExistentNode_returnsEmptyList() {
        Node nonExistentNode = new Node("D");
        List<Node> neighbors = graph.getAdjNodes(nonExistentNode);
        assertNotNull(neighbors);
        assertTrue(neighbors.isEmpty());
    }

    @Test
    void getAdjNodes_returnsUnmodifiableList() {
        graph.addEdge(nodeA, nodeB);
        List<Node> neighbors = graph.getAdjNodes(nodeA);
        assertThrows(UnsupportedOperationException.class, () -> neighbors.add(nodeC));
    }

    @Test
    void removeNode_removesIncomingEdges() {
        graph.addEdge(nodeA, nodeC);
        graph.addEdge(nodeB, nodeC);

        assertTrue(graph.getAdjNodes(nodeA).contains(nodeC));
        assertTrue(graph.getAdjNodes(nodeB).contains(nodeC));

        graph.removeNode(nodeC);

        assertFalse(graph.getAdjNodes(nodeA).contains(nodeC));
        assertFalse(graph.getAdjNodes(nodeB).contains(nodeC));
        assertFalse(graph.getNodes().contains(nodeC));
    }

    @Test
    void constructor_nullName_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> new Node(null));
    }
}
