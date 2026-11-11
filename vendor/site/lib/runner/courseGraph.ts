import { Graph, executeCypher } from "@site/lib/runner/cypher";

export const GRAPH_SETUP = `
CREATE (tom:Person {name:"Tom Hanks", born:1956}), (kevin:Person {name:"Kevin Bacon", born:1958}),
  (meg:Person {name:"Meg Ryan", born:1961}), (gary:Person {name:"Gary Sinise", born:1955}),
  (bill:Person {name:"Bill Paxton", born:1955}), (ed:Person {name:"Ed Harris", born:1950}),
  (ron:Person {name:"Ron Howard", born:1954}), (robin:Person {name:"Robin Wright", born:1966}),
  (jack:Person {name:"Jack Nicholson", born:1937}), (cruise:Person {name:"Tom Cruise", born:1962}),
  (apollo:Movie {title:"Apollo 13", released:1995}), (gump:Movie {title:"Forrest Gump", released:1994}),
  (castaway:Movie {title:"Cast Away", released:2000}), (sleepless:Movie {title:"Sleepless in Seattle", released:1993}),
  (mail:Movie {title:"You've Got Mail", released:1998}), (thing:Movie {title:"That Thing You Do", released:1996}),
  (larry:Movie {title:"Larry Crowne", released:2011}), (fewgood:Movie {title:"A Few Good Men", released:1992}),
  (frost:Movie {title:"Frost/Nixon", released:2008}),
  (tom)-[:ACTED_IN {roles:["Jim Lovell"]}]->(apollo), (tom)-[:ACTED_IN {roles:["Forrest Gump"]}]->(gump),
  (tom)-[:ACTED_IN {roles:["Chuck Noland"]}]->(castaway), (tom)-[:ACTED_IN {roles:["Sam Baldwin"]}]->(sleepless),
  (tom)-[:ACTED_IN {roles:["Joe Fox"]}]->(mail), (tom)-[:ACTED_IN {roles:["Mr. White"]}]->(thing),
  (tom)-[:ACTED_IN {roles:["Larry Crowne"]}]->(larry),
  (kevin)-[:ACTED_IN {roles:["Jack Swigert"]}]->(apollo), (kevin)-[:ACTED_IN {roles:["Capt. Jack Ross"]}]->(fewgood),
  (kevin)-[:ACTED_IN {roles:["Jim Reston"]}]->(frost),
  (gary)-[:ACTED_IN {roles:["Ken Mattingly"]}]->(apollo), (gary)-[:ACTED_IN {roles:["Lt. Dan Taylor"]}]->(gump),
  (bill)-[:ACTED_IN {roles:["Fred Haise"]}]->(apollo), (ed)-[:ACTED_IN {roles:["Gene Kranz"]}]->(apollo),
  (meg)-[:ACTED_IN {roles:["Annie Reed"]}]->(sleepless), (meg)-[:ACTED_IN {roles:["Kathleen Kelly"]}]->(mail),
  (robin)-[:ACTED_IN {roles:["Jenny Curran"]}]->(gump), (jack)-[:ACTED_IN {roles:["Col. Jessup"]}]->(fewgood),
  (cruise)-[:ACTED_IN {roles:["Lt. Kaffee"]}]->(fewgood),
  (ron)-[:DIRECTED]->(apollo), (ron)-[:DIRECTED]->(frost), (tom)-[:DIRECTED]->(thing), (tom)-[:DIRECTED]->(larry);

CREATE (jim:Person {name:'Jim'}), (ian:Person {name:'Ian'}), (emil:Person {name:'Emil'}),
  (jim)-[:KNOWS]->(ian), (jim)-[:KNOWS]->(emil), (ian)-[:KNOWS]->(emil);

CREATE (alice:Person {name:'Alice'}), (patty:Person {name:'Patty'}), (tomf:Person {name:'Tom'}),
  (bob:Person {name:'Bob'}), (dan:Person {name:'Dan'}),
  (alice)-[:FRIEND]->(patty), (alice)-[:FRIEND]->(bob), (patty)-[:FRIEND]->(tomf),
  (bob)-[:FRIEND]->(tomf), (patty)-[:FRIEND]->(dan);

CREATE (shakespeare:Author {firstname:'William', lastname:'Shakespeare'}),
  (juliusCaesar:Play {title:'Julius Caesar'}), (shakespeare)-[:WROTE_PLAY {year:1599}]->(juliusCaesar),
  (theTempest:Play {title:'The Tempest'}), (shakespeare)-[:WROTE_PLAY {year:1610}]->(theTempest),
  (rsc:Company {name:'RSC'}),
  (production1:Production {name:'Julius Caesar'}), (rsc)-[:PRODUCED]->(production1),
  (production1)-[:PRODUCTION_OF]->(juliusCaesar),
  (performance1:Performance {date:20120729}), (performance1)-[:PERFORMANCE_OF]->(production1),
  (production2:Production {name:'The Tempest'}), (rsc)-[:PRODUCED]->(production2),
  (production2)-[:PRODUCTION_OF]->(theTempest),
  (performance2:Performance {date:20061121}), (performance2)-[:PERFORMANCE_OF]->(production2),
  (performance3:Performance {date:20120730}), (performance3)-[:PERFORMANCE_OF]->(production1),
  (billy:User {name:'Billy'}), (review:Review {rating:5, review:'This was awesome!'}),
  (billy)-[:WROTE_REVIEW]->(review), (review)-[:REVIEW_OF]->(performance1),
  (theatreRoyal:Venue {name:'Theatre Royal'}),
  (performance1)-[:VENUE]->(theatreRoyal), (performance2)-[:VENUE]->(theatreRoyal), (performance3)-[:VENUE]->(theatreRoyal),
  (greyStreet:Street {name:'Grey Street'}), (theatreRoyal)-[:STREET]->(greyStreet),
  (newcastle:City {name:'Newcastle'}), (greyStreet)-[:CITY]->(newcastle),
  (tyneAndWear:County {name:'Tyne and Wear'}), (newcastle)-[:COUNTY]->(tyneAndWear),
  (england:Country {name:'England'}), (tyneAndWear)-[:COUNTRY]->(england),
  (stratford:City {name:'Stratford upon Avon'}), (stratford)-[:COUNTRY]->(england),
  (rsc)-[:BASED_IN]->(stratford), (shakespeare)-[:BORN_IN]->(stratford);

CREATE (u3:User {name:'User 3'}),
  (app1:App:Asset {id:'App 1', status:'up'}), (app2:App:Asset {id:'App 2', status:'up'}), (app3:App:Asset {id:'App 3', status:'up'}),
  (db1:Database:Asset {id:'Database Server 1', status:'up'}), (db2:Database:Asset {id:'Database Server 2', status:'up'}),
  (db3:Database:Asset {id:'Database Server 3', status:'up'}),
  (vm10:VM:Asset {id:'VM 10', status:'up'}), (vm11:VM:Asset {id:'VM 11', status:'up'}), (vm20:VM:Asset {id:'VM 20', status:'up'}),
  (vm30:VM:Asset {id:'VM 30', status:'up'}), (vm31:VM:Asset {id:'VM 31', status:'up'}),
  (s1:Server:Asset {id:'Server 1', status:'up'}), (s2:Server:Asset {id:'Server 2', status:'down'}), (s3:Server:Asset {id:'Server 3', status:'up'}),
  (r1:Rack:Asset {id:'Rack 1', status:'up'}), (r2:Rack:Asset {id:'Rack 2', status:'up'}),
  (lb1:LoadBalancer:Asset {id:'Load Balancer 1', status:'up'}), (lb2:LoadBalancer:Asset {id:'Load Balancer 2', status:'down'}),
  (u3)-[:USER_OF]->(app3),
  (app1)-[:USES]->(db1), (app2)-[:USES]->(db1), (app3)-[:USES]->(db3),
  (db2)-[:SLAVE_OF]->(db1), (db3)-[:SLAVE_OF]->(db1),
  (app1)-[:RUNS_ON]->(vm10), (app1)-[:RUNS_ON]->(vm11), (app2)-[:RUNS_ON]->(vm20),
  (app3)-[:RUNS_ON]->(vm30), (app3)-[:RUNS_ON]->(vm31),
  (vm10)-[:HOSTED_BY]->(s1), (vm11)-[:HOSTED_BY]->(s2), (vm20)-[:HOSTED_BY]->(s2), (vm30)-[:HOSTED_BY]->(s2),
  (vm31)-[:HOSTED_BY]->(s3),
  (s1)-[:IN]->(r1), (s2)-[:IN]->(r1), (s3)-[:IN]->(r2), (lb1)-[:IN]->(r1), (lb2)-[:IN]->(r2);

CREATE (alice:User {username:'Alice'}), (bob:User {username:'Bob'}), (charlie:User {username:'Charlie'}),
  (davina:User {username:'Davina'}), (edward:User {username:'Edward'}), (alice)-[:ALIAS_OF]->(bob),
  (e1:Email {id:'1', content:'Hi Charlie, ... Kind regards, Bob'}), (bob)-[:SENT]->(e1), (e1)-[:TO]->(charlie),
  (e1)-[:CC]->(davina), (e1)-[:CC]->(alice), (e1)-[:BCC]->(edward),
  (e2:Email {id:'2', content:'email contents'}), (bob)-[:SENT]->(e2), (e2)-[:TO]->(davina), (e2)-[:BCC]->(edward),
  (e3:Email {id:'3', content:'email contents'}), (davina)-[:SENT]->(e3), (e3)-[:TO]->(bob), (e3)-[:CC]->(edward),
  (e4:Email {id:'4', content:'email contents'}), (charlie)-[:SENT]->(e4), (e4)-[:TO]->(bob), (e4)-[:TO]->(davina), (e4)-[:TO]->(edward),
  (e5:Email {id:'5', content:'email contents'}), (davina)-[:SENT]->(e5), (e5)-[:TO]->(alice), (e5)-[:BCC]->(bob), (e5)-[:BCC]->(edward),
  (e6:Email {id:'6', content:'email'}), (bob)-[:SENT]->(e6), (e6)-[:TO]->(charlie), (e6)-[:TO]->(davina),
  (r7:Email:Reply {id:'7', content:'response'}), (r7)-[:REPLY_TO]->(e6), (davina)-[:SENT]->(r7), (r7)-[:TO]->(bob), (r7)-[:TO]->(charlie),
  (r8:Email:Reply {id:'8', content:'response'}), (r8)-[:REPLY_TO]->(e6), (bob)-[:SENT]->(r8), (r8)-[:TO]->(davina), (r8)-[:TO]->(charlie), (r8)-[:CC]->(alice),
  (r9:Email:Reply {id:'9', content:'response'}), (r9)-[:REPLY_TO]->(r7), (charlie)-[:SENT]->(r9), (r9)-[:TO]->(bob), (r9)-[:TO]->(davina),
  (r10:Email:Reply {id:'10', content:'response'}), (r10)-[:REPLY_TO]->(r9), (bob)-[:SENT]->(r10), (r10)-[:TO]->(charlie), (r10)-[:TO]->(davina),
  (e11:Email {id:'11', content:'email'}), (alice)-[:SENT]->(e11), (e11)-[:TO]->(bob),
  (e12:Email:Forward {id:'12', content:'email'}), (e12)-[:FORWARD_OF]->(e11), (bob)-[:SENT]->(e12), (e12)-[:TO]->(charlie),
  (e13:Email:Forward {id:'13', content:'email'}), (e13)-[:FORWARD_OF]->(e12), (charlie)-[:SENT]->(e13), (e13)-[:TO]->(davina);

CREATE (:EphemeralNode {name:'temp 1'})-[:short_lived_relationship]->(:EphemeralNode {name:'temp 2'});
`;

let seed: Graph | null = null;

/** A fresh copy of the sample graph: every run starts from the same data. */
export function courseGraph() {
  if (!seed) {
    seed = new Graph();
    const result = executeCypher(seed, GRAPH_SETUP);
    if (result.error) throw new Error(`Sample graph failed to load: ${result.error.message}`);
  }
  return seed.clone();
}
