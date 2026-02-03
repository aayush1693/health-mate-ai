# Spring Boot Project Setup Instructions

## Using start.spring.io

Visit [https://start.spring.io](https://start.spring.io) and configure:

### Project Settings
- **Project:** Maven
- **Language:** Java
- **Spring Boot:** 3.2.5
- **Packaging:** Jar
- **Java:** 17

### Project Metadata
- **Group:** com.healthmate
- **Artifact:** healthmate
- **Name:** HealthMate
- **Description:** HealthMate AI Medical Assistant Backend
- **Package name:** com.healthmate

### Dependencies to Add
Click "ADD DEPENDENCIES" and add:

1. **Spring Web** - Build web applications with Spring MVC
2. **Spring Security** - Authentication and access control
3. **Spring Data JPA** - Persist data with Java Persistence API
4. **PostgreSQL Driver** - PostgreSQL database driver
5. **Validation** - Bean Validation with Hibernate validator
6. **Lombok** - Java annotation library for reducing boilerplate
7. **Spring Boot DevTools** - Fast application restarts, LiveReload
8. **Java Mail Sender** - Send email using Java Mail
9. **Liquibase Migration** - Database migrations with Liquibase

### Additional Dependencies (Add to pom.xml manually)

After generating the project, add these dependencies to your `pom.xml`:

```xml
<!-- JWT Dependencies -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
</dependency>
```

### Quick Generation URL

You can also use this URL to generate the project directly:

```
https://start.spring.io/#!type=maven-project&language=java&platformVersion=3.2.5&packaging=jar&jvmVersion=17&groupId=com.healthmate&artifactId=healthmate&name=HealthMate&description=HealthMate%20AI%20Medical%20Assistant%20Backend&packageName=com.healthmate&dependencies=web,security,data-jpa,postgresql,validation,lombok,devtools,mail,liquibase
```

## Project Structure After Generation

```
healthmate/
├── src/
│   ├── main/
│   │   ├── java/com/healthmate/
│   │   │   └── HealthmateApplication.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/changelog/
│   │           └── db.changelog-master.yaml
│   └── test/
│       └── java/com/healthmate/
│           └── HealthmateApplicationTests.java
├── pom.xml
└── mvnw / mvnw.cmd
```

## After Generation

1. **Copy the code files** from this project's backend folder
2. **Update application.properties** with your database and email credentials
3. **Run the database setup script** to create the PostgreSQL database
4. **Run the application:**
   ```bash
   ./mvnw spring-boot:run
   ```

## IDE Setup

### IntelliJ IDEA
1. Open IntelliJ IDEA
2. File → Open → Select the project folder
3. Wait for Maven to import dependencies
4. Enable annotation processing for Lombok:
   - Settings → Build → Compiler → Annotation Processors
   - Check "Enable annotation processing"

### VS Code
1. Install Java Extension Pack
2. Install Spring Boot Extension Pack
3. Open the project folder
4. Let VS Code download dependencies

### Eclipse
1. File → Import → Maven → Existing Maven Projects
2. Select the project folder
3. Install Lombok plugin for Eclipse
