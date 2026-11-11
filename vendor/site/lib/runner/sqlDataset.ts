/**
 * The sample database every runnable SQL snippet starts from. Each run executes inside a
 * transaction that is rolled back afterwards, so a run never changes it.
 */
export const SQL_SETUP = `
create extension if not exists vector;

create table professoren (persnr int primary key, name text, rang text, raum int);
insert into professoren values
  (2125, 'Sokrates', 'C4', 226), (2126, 'Russel', 'C4', 232), (2127, 'Kopernikus', 'C3', 310),
  (2133, 'Popper', 'C3', 52), (2134, 'Augustinus', 'C3', 309), (2136, 'Curie', 'C4', 36),
  (2137, 'Kant', 'C4', 7);

create table vorlesungen (vorlnr int primary key, titel text, sws int, gelesenvon int references professoren);
insert into vorlesungen values
  (5001, 'Grundzüge', 4, 2137), (5041, 'Ethik', 4, 2125), (5043, 'Erkenntnistheorie', 3, 2126),
  (5049, 'Mäeutik', 2, 2125), (4052, 'Logik', 4, 2125), (5052, 'Wissenschaftstheorie', 3, 2126),
  (5216, 'Bioethik', 2, 2126), (5259, 'Der Wiener Kreis', 2, 2133), (5022, 'Glaube und Wissen', 2, 2134),
  (4630, 'Die 3 Kritiken', 4, 2137);

create table data (x float, y float);
insert into data values
  (0, 1.1), (0.5, 1.9), (1, 3.2), (1.5, 3.9), (2, 5.1),
  (2.5, 6.0), (3, 7.2), (3.5, 7.9), (4, 9.1), (4.5, 9.8);

create table iris (id int, row int, sepal_length float, sepal_width float,
                   petal_length float, petal_width float, species text);
insert into iris values
  (1, 1, 5.1, 3.5, 1.4, 0.2, 'setosa'), (2, 2, 4.9, 3.0, 1.4, 0.2, 'setosa'),
  (3, 3, 4.7, 3.2, 1.3, 0.2, 'setosa'), (4, 4, 5.0, 3.6, 1.4, 0.2, 'setosa'),
  (5, 5, 7.0, 3.2, 4.7, 1.4, 'versicolor'), (6, 6, 6.4, 3.2, 4.5, 1.5, 'versicolor'),
  (7, 7, 6.9, 3.1, 4.9, 1.5, 'versicolor'), (8, 8, 5.5, 2.3, 4.0, 1.3, 'versicolor'),
  (9, 9, 6.3, 3.3, 6.0, 2.5, 'virginica'), (10, 10, 5.8, 2.7, 5.1, 1.9, 'virginica'),
  (11, 11, 7.1, 3.0, 5.9, 2.1, 'virginica'), (12, 12, 6.3, 2.9, 5.6, 1.8, 'virginica');

create table items (id int primary key, name text, price numeric, embedding vector(3));
insert into items values
  (1, 'Trail running shoes', 89, '[3,1,2]'), (2, 'Road running shoes', 120, '[3,1,3]'),
  (3, 'Hiking boots', 150, '[2,1,1]'), (4, 'Sports socks', 9, '[3,2,2]'),
  (5, 'Rain jacket', 95, '[1,3,1]'), (6, 'Water bottle', 15, '[2,2,4]'),
  (7, 'Running watch', 199, '[4,1,2]'), (8, 'Yoga mat', 30, '[1,1,5]');

create table statements (subject text, predicate text, object text);
insert into statements values
  ('1','type','article'), ('1','title','LAURIN'), ('1','author','Catarci'), ('1','author','Santucci'),
  ('1','author','Calvanese'), ('1','journal','WWW'), ('1','year','2001'), ('1','file','CSC01.pdf'),
  ('2','type','book'), ('2','author','Codd'), ('2','title','The Relational Model'), ('2','year','1990'),
  ('2','publisher','Addison-Wesley'),
  ('3','type','book'), ('3','title','Principles of DB Systems'), ('3','author','Vianu'), ('3','author','Hull'),
  ('3','author','Abiteboul'), ('3','year','1995'), ('3','publisher','Addison-Wesley'),
  ('4','type','article'), ('4','title','Web-Based Data'), ('4','author','Atzeni'), ('4','author','Merialdo'),
  ('4','author','Mecca'), ('4','journal','IEEE Int. Comp.'), ('4','file','AMM02.pdf');

create table employee (name text, dept text, salary int);
insert into employee values
  ('Ann', 'Sales', 42000), ('Bob', 'Sales', 38000), ('Cem', 'IT', 55000),
  ('Dana', 'IT', 61000), ('Eva', 'IT', 47000), ('Finn', 'HR', 40000);
`;
