package com.example;

import software.amazon.smithy.model.Model;
import software.amazon.smithy.model.loader.ModelAssembler;
import software.amazon.smithy.model.shapes.Shape;
import software.amazon.smithy.model.neighbor.NeighborProvider;
import software.amazon.smithy.model.neighbor.Relationship;

import java.nio.file.Paths;
import java.util.List;

public class SmithyProcessor {

    public static void main(String[] args) {
        System.out.println("Starting Smithy model processing...");

        try {
            // 1. Load the Smithy model using the ModelAssembler.
            ModelAssembler assembler = Model.assembler();
            assembler.addImport(Paths.get("graph-java/models"));
            Model model = assembler.assemble().unwrap();

            System.out.println("Model loaded successfully. Found " + model.toSet().size() + " shapes.");

            // 2. Create our custom graph instance.
            Graph graph = new Graph();

            // 3. Populate our graph from the Smithy model.
            for (Shape shape : model.toSet()) {
                Node node = new Node(shape.getId().toString());
                graph.addNode(node);
            }

            // The NeighborProvider gives us all the relationships (edges) between shapes.
            NeighborProvider neighborProvider = NeighborProvider.of(model);

            for (Shape shape : model.toSet()) {
                Node sourceNode = new Node(shape.getId().toString());
                for (Relationship relationship : neighborProvider.getNeighbors(shape)) {
                    Node targetNode = new Node(relationship.getShape().getId().toString());
                    graph.addEdge(sourceNode, targetNode);
                }
            }

            System.out.println("Graph populated successfully.");

            // 4. Perform and display the analysis (the "LLM Brain" part).
            System.out.println("\n--- Smithy Model Graph Analysis ---");
            for (Node node : graph.getNodes()) {
                List<Node> neighbors = graph.getAdjNodes(node);
                if (!neighbors.isEmpty()) {
                    System.out.println("\nShape: " + node.getName());
                    System.out.println("  - Is connected to:");
                    for (Node neighbor : neighbors) {
                        System.out.println("    -> " + neighbor.getName());
                    }
                }
            }
            System.out.println("\n--- End of Analysis ---");

        } catch (Exception e) {
            System.err.println("An error occurred during Smithy model processing:");
            e.printStackTrace();
        }
    }
}