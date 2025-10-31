
$version: "2.0"

namespace com.example.weather

/// Provides weather forecasts.
@paginated(inputToken: "nextToken", outputToken: "nextToken", pageSize: "pageSize")
service Weather {
    version: "2023-11-20",
    resources: [City],
    operations: [GetCurrentTime]
}

resource City {
    identifiers: {
        cityId: CityId,
    },
    read: GetCity,
    list: ListCities,
    resources: [Forecast],
}

resource Forecast {
    identifiers: {
        cityId: CityId,
        forecastId: ForecastId
    },
    read: GetForecast
}


// Operations

@readonly
operation GetCity {
    input: GetCityInput,
    output: GetCityOutput,
    errors: [NoSuchResource]
}

@readonly
operation ListCities {
    input: ListCitiesInput,
    output: ListCitiesOutput
}

@readonly
operation GetForecast {
    input: GetForecastInput,
    output: GetForecastOutput,
    errors: [NoSuchResource]
}

@readonly
operation GetCurrentTime {
    input: GetCurrentTimeInput,
    output: GetCurrentTimeOutput
}

// Inputs and Outputs

structure GetCityInput {
    @required
    cityId: CityId,
}

structure GetCityOutput {
    @required
    name: String,
    @required
    coordinates: CityCoordinates,
}

structure ListCitiesInput {
    nextToken: String,
    pageSize: Integer,
}

structure ListCitiesOutput {
    nextToken: String,
    @required
    items: CitySummaries,
}

structure GetForecastInput {
    @required
    cityId: CityId,
    @required
    forecastId: ForecastId,
}

structure GetForecastOutput {
    chanceOfRain: Float,
    temperature: Temperature,
}

structure GetCurrentTimeInput {}

structure GetCurrentTimeOutput {
    @required
    time: Timestamp,
}

// Common Shapes

@error("client")
structure NoSuchResource {
    @required
    resourceType: String,
}

structure CityCoordinates {
    @required
    latitude: Float,
    @required
    longitude: Float,
}

structure Temperature {
    low: Integer,
    high: Integer,
}

list CitySummaries {
    member: CitySummary
}

structure CitySummary {
    @required
    cityId: CityId,
    @required
    name: String,
}

@pattern("^[A-Za-z0-9_.-]+$")
string CityId

string ForecastId
