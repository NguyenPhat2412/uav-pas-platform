FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN chmod +x mvnw
RUN ./mvnw -B dependency:go-offline

COPY src/ src/

RUN ./mvnw -B clean package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /workspace/target/*.jar app.jar

# Build facts shown at Admin > Infrastructure > Deployment. Declared after the jar copy so changing them
# only rebuilds this cheap layer. deploy/docker-compose.prod.yml passes them; "unknown" when built without.
ARG APP_VERSION=unknown
ARG APP_GIT_COMMIT=unknown
ARG APP_BUILD_TIME=unknown
ENV APP_VERSION=${APP_VERSION} \
    APP_GIT_COMMIT=${APP_GIT_COMMIT} \
    APP_BUILD_TIME=${APP_BUILD_TIME}

# One business time zone for every LocalDateTime the backend reads or stores (see UavPlatformApplication).
ENV TZ=Asia/Ho_Chi_Minh

EXPOSE 8080

ENTRYPOINT ["java", "-Duser.timezone=Asia/Ho_Chi_Minh", "-jar", "app.jar"]