#!/bin/bash

# LLM End-to-End Test Runner
# This script runs comprehensive end-to-end tests for the LLM functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
TEST_TIMEOUT=300000 # 5 minutes
CONCURRENT_TESTS=4

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if the API is running
check_api_health() {
    print_status "Checking API health..."
    
    if curl -s -f "$BASE_URL/api/v1/health" > /dev/null; then
        print_success "API is running and healthy"
        return 0
    else
        print_error "API is not running or not healthy"
        return 1
    fi
}

# Function to wait for API to be ready
wait_for_api() {
    print_status "Waiting for API to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if check_api_health; then
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting 10 seconds..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_error "API failed to become ready after $max_attempts attempts"
    return 1
}

# Function to run basic integration tests
run_integration_tests() {
    print_status "Running LLM integration tests..."
    
    if npm run test:e2e -- --testPathPattern=llm-integration; then
        print_success "LLM integration tests passed"
        return 0
    else
        print_error "LLM integration tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running LLM performance tests..."
    
    if npm run test:e2e -- --testPathPattern=llm-performance; then
        print_success "LLM performance tests passed"
        return 0
    else
        print_error "LLM performance tests failed"
        return 1
    fi
}

# Function to run load tests
run_load_tests() {
    print_status "Running LLM load tests..."
    
    # Check if we have a valid auth token
    if [ -z "$AUTH_TOKEN" ]; then
        print_warning "No AUTH_TOKEN provided, skipping load tests"
        return 0
    fi
    
    # Run load tests with different scenarios
    local scenarios=("light" "medium")
    
    for scenario in "${scenarios[@]}"; do
        print_status "Running load test scenario: $scenario"
        
        if npx ts-node test/llm-load-test.ts "$BASE_URL" "$AUTH_TOKEN" "$scenario"; then
            print_success "Load test scenario '$scenario' passed"
        else
            print_error "Load test scenario '$scenario' failed"
            return 1
        fi
    done
    
    return 0
}

# Function to run WebSocket tests
run_websocket_tests() {
    print_status "Running WebSocket integration tests..."
    
    if npm run test:e2e -- --testPathPattern=websocket; then
        print_success "WebSocket integration tests passed"
        return 0
    else
        print_error "WebSocket integration tests failed"
        return 1
    fi
}

# Function to run all existing e2e tests
run_existing_tests() {
    print_status "Running existing e2e tests..."
    
    local test_files=(
        "app.e2e-spec.ts"
        "chats.e2e-spec.ts"
        "messages.e2e-spec.ts"
    )
    
    for test_file in "${test_files[@]}"; do
        print_status "Running $test_file..."
        
        if npm run test:e2e -- --testPathPattern="$test_file"; then
            print_success "$test_file passed"
        else
            print_error "$test_file failed"
            return 1
        fi
    done
    
    return 0
}

# Function to generate test report
generate_test_report() {
    print_status "Generating test report..."
    
    local report_dir="test-reports"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local report_file="$report_dir/e2e-test-report-$timestamp.json"
    
    mkdir -p "$report_dir"
    
    # Create a simple test report
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "baseUrl": "$BASE_URL",
  "testResults": {
    "integration": $1,
    "performance": $2,
    "load": $3,
    "websocket": $4,
    "existing": $5
  },
  "summary": {
    "totalTests": 5,
    "passed": $(($1 + $2 + $3 + $4 + $5)),
    "failed": $((5 - $1 - $2 - $3 - $4 - $5))
  }
}
EOF
    
    print_success "Test report generated: $report_file"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Kill any background processes
    jobs -p | xargs -r kill
    
    # Clean up test data if needed
    print_success "Cleanup completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -u, --url URL           Base URL for the API (default: http://localhost:3001)"
    echo "  -t, --token TOKEN       Auth token for load tests"
    echo "  --skip-load             Skip load tests"
    echo "  --skip-performance      Skip performance tests"
    echo "  --skip-integration      Skip integration tests"
    echo "  --skip-websocket        Skip WebSocket tests"
    echo "  --skip-existing         Skip existing e2e tests"
    echo "  --parallel              Run tests in parallel"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests"
    echo "  $0 --skip-load                       # Skip load tests"
    echo "  $0 -u http://localhost:3000          # Use different URL"
    echo "  $0 -t your-jwt-token-here            # Run with auth token"
}

# Main function
main() {
    # Parse command line arguments
    SKIP_LOAD=false
    SKIP_PERFORMANCE=false
    SKIP_INTEGRATION=false
    SKIP_WEBSOCKET=false
    SKIP_EXISTING=false
    RUN_PARALLEL=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -u|--url)
                BASE_URL="$2"
                shift 2
                ;;
            -t|--token)
                AUTH_TOKEN="$2"
                shift 2
                ;;
            --skip-load)
                SKIP_LOAD=true
                shift
                ;;
            --skip-performance)
                SKIP_PERFORMANCE=true
                shift
                ;;
            --skip-integration)
                SKIP_INTEGRATION=true
                shift
                ;;
            --skip-websocket)
                SKIP_WEBSOCKET=true
                shift
                ;;
            --skip-existing)
                SKIP_EXISTING=true
                shift
                ;;
            --parallel)
                RUN_PARALLEL=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    print_status "Starting LLM End-to-End Test Suite"
    print_status "Base URL: $BASE_URL"
    print_status "Auth Token: ${AUTH_TOKEN:+[PROVIDED]}"
    
    # Wait for API to be ready
    if ! wait_for_api; then
        print_error "Failed to start tests - API not ready"
        exit 1
    fi
    
    # Initialize test results
    local integration_result=0
    local performance_result=0
    local load_result=0
    local websocket_result=0
    local existing_result=0
    
    # Run tests
    if [ "$SKIP_EXISTING" = false ]; then
        if run_existing_tests; then
            existing_result=1
        fi
    else
        print_status "Skipping existing e2e tests"
        existing_result=1
    fi
    
    if [ "$SKIP_INTEGRATION" = false ]; then
        if run_integration_tests; then
            integration_result=1
        fi
    else
        print_status "Skipping integration tests"
        integration_result=1
    fi
    
    if [ "$SKIP_PERFORMANCE" = false ]; then
        if run_performance_tests; then
            performance_result=1
        fi
    else
        print_status "Skipping performance tests"
        performance_result=1
    fi
    
    if [ "$SKIP_WEBSOCKET" = false ]; then
        if run_websocket_tests; then
            websocket_result=1
        fi
    else
        print_status "Skipping WebSocket tests"
        websocket_result=1
    fi
    
    if [ "$SKIP_LOAD" = false ]; then
        if run_load_tests; then
            load_result=1
        fi
    else
        print_status "Skipping load tests"
        load_result=1
    fi
    
    # Generate test report
    generate_test_report $integration_result $performance_result $load_result $websocket_result $existing_result
    
    # Print summary
    local total_tests=5
    local passed_tests=$((integration_result + performance_result + load_result + websocket_result + existing_result))
    local failed_tests=$((total_tests - passed_tests))
    
    echo ""
    print_status "=== Test Summary ==="
    print_status "Total test suites: $total_tests"
    print_status "Passed: $passed_tests"
    print_status "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All tests passed! 🎉"
        exit 0
    else
        print_error "Some tests failed. Please check the logs above."
        exit 1
    fi
}

# Run main function
main "$@"
