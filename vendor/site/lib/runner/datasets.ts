import type { RunLanguage } from "@site/lib/runner/types";

/** Short descriptions of the sample data, shown next to runnable snippets (no engine code here). */
export const SQL_TABLES: { name: string; columns: string; about: string }[] = [
  { name: "professoren", columns: "persnr, name, rang, raum", about: "Lecture 3 university schema" },
  { name: "vorlesungen", columns: "vorlnr, titel, sws, gelesenvon", about: "Lectures, gelesenvon → professoren" },
  { name: "data", columns: "x, y", about: "Points near y = 2x + 1 (gradient descent)" },
  { name: "iris", columns: "id, row, sepal_length, sepal_width, petal_length, petal_width, species", about: "12 rows of the Iris data" },
  { name: "items", columns: "id, name, price, embedding vector(3)", about: "Products with embeddings (pgvector)" },
  { name: "statements", columns: "subject, predicate, object", about: "RDF triples of four publications" },
  { name: "employee", columns: "name, dept, salary", about: "A small table for GROUP BY practice" },
];

export const GRAPH_CONTENTS: { name: string; about: string }[] = [
  { name: "Movies", about: "(:Person {name, born})-[:ACTED_IN {roles}|:DIRECTED]->(:Movie {title, released})" },
  { name: "Mutual friends", about: "(:Person {name:'Jim'|'Ian'|'Emil'})-[:KNOWS]->(:Person)" },
  { name: "Friends", about: "(:Person {name:'Alice'|'Patty'|'Tom'|'Bob'|'Dan'})-[:FRIEND]->(:Person)" },
  { name: "Shakespeare", about: "Author, Play, Company, Production, Performance, User, Review, Venue, Street, City, County, Country" },
  { name: "Data centre", about: "(:User {name:'User 3'}), App, VM, Server, Rack, Load Balancer, Database — all also :Asset {id, status}" },
  { name: "Email", about: "(:User {username})-[:SENT]->(:Email {id})-[:TO|CC|BCC]->(:User); :Reply, :Forward, ALIAS_OF" },
  { name: "Scratch", about: "(:EphemeralNode)-[:short_lived_relationship]->(:EphemeralNode)" },
];

export const GREMLIN_CONTENTS: { name: string; about: string }[] = [
  { name: "v[0]", about: "Prancing Wolf Ice Wine 2007" },
  { name: "v[1]", about: "Wine Expert Monthly — e[0]: v[1] -reported_on-> v[0]" },
  { name: "v[2]", about: "riesling — e[1]: v[0] -grape_type-> v[2]" },
];

export const ENGINE_LABEL: Record<RunLanguage, string> = {
  sql: "PostgreSQL 17 in your browser",
  cypher: "Cypher — a teaching interpreter, not Neo4j",
  gremlin: "Gremlin console — a teaching interpreter",
};
