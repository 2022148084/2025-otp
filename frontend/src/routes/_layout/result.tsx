import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  Box,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
  Link,
  Button,
  Tabs,
} from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { RecommendationsService } from "../../client"
import { useAnalysisStore } from "../../store/analysisStore"

// 네이버 지도 객체 타입 선언
declare global {
  interface Window {
    naver: any
  }
}

// URL 파라미터(fileId) 정의
export const Route = createFileRoute("/_layout/result")({
  component: Result,
  validateSearch: (search: Record<string, unknown>) => ({
    fileId: search.fileId as string,
  }),
})

function Result() {
  const { fileId } = Route.useSearch() // URL에서 fileId 추출
  const navigate = useNavigate()
  const setAnalysisData = useAnalysisStore((state) => state.setAnalysisData)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const [resultData, setResultData] = useState<any>(null)
  const [tabValue, setTabValue] = useState("1") // Chakra v3 Tabs value는 string

  // 추천 API 호출 Mutation
  const recommendMutation = useMutation({
    mutationFn: (fid: string) =>
      RecommendationsService.createRecommendation({
        requestBody: {
          file_id: fid,
        },
      }),
    onSuccess: (data: any) => {
      setResultData(data)
      
      // 편집창을 위해 분석 데이터를 스토어에 저장 (Zustand)
      if (data.analysis) {
        setAnalysisData(data.analysis)
      }

      // 데이터 로드 후 첫 번째 경로 지도 그리기
      if (data.routes && data.routes.length > 0) {
        setTimeout(() => initMap(data.routes[0].places), 100) 
      }
    },
  })

  // 페이지 진입 시 API 호출
  useEffect(() => {
    if (fileId) {
      recommendMutation.mutate(fileId)
    }
  }, [fileId])

  // 탭 변경 시 지도 다시 그리기
  const handleTabChange = (details: { value: string }) => {
    const newValue = details.value
    setTabValue(newValue)
    
    // value는 "1", "2", "3"이므로 인덱스는 value - 1
    const index = parseInt(newValue) - 1
    if (resultData?.routes[index]) {
      initMap(resultData.routes[index].places)
    }
  }

  // 네이버 지도 초기화 및 마커 생성 함수
  const initMap = (places: any[]) => {
    if (!window.naver || !mapRef.current) return

    const centerLat = places.length > 0 ? places[0].lat : 37.5665
    const centerLng = places.length > 0 ? places[0].lng : 126.9780

    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(centerLat, centerLng),
      zoom: 14,
    })

    const path: any[] = []

    places.forEach((place, index) => {
      const latLng = new window.naver.maps.LatLng(place.lat, place.lng)
      path.push(latLng)

      new window.naver.maps.Marker({
        position: latLng,
        map: map,
        title: place.name,
        icon: {
          content: `<div style="background:#319795; color:white; width:24px; height:24px; 
                    border-radius:50%; text-align:center; line-height:24px; font-weight:bold;
                    border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);">
                    ${index + 1}</div>`,
        },
      })
    })

    if (path.length > 1) {
      new window.naver.maps.Polyline({
        map: map,
        path: path,
        strokeColor: "#319795",
        strokeWeight: 5,
        strokeOpacity: 0.7,
      })
    }
  }

  // 로딩 상태
  if (recommendMutation.isPending) {
    return (
      <Container centerContent py={20}>
        <Spinner size="xl" color="teal.500" borderWidth="4px" />
        <Text mt={4} fontSize="lg">AI가 최적의 경로를 3가지로 분석 중입니다...</Text>
        <Text fontSize="sm" color="gray.500">(약 5~10초 소요)</Text>
      </Container>
    )
  }

  // 에러 상태
  if (recommendMutation.isError) {
    return (
      <Container py={20}>
        <Text color="red.500">
          분석 중 오류가 발생했습니다.<br/>
          {recommendMutation.error?.message}
        </Text>
      </Container>
    )
  }

  // 결과 화면
  return (
    // md(태블릿) 구간에서도 column(세로) 배치를 유지
    <Flex direction={{ base: "column", md: "column", lg: "row" }} h="calc(100vh - 64px)">
      
      {/* 왼쪽: 지도 영역 */}
      <Box 
        flex="1" 
        h={{ base: "50vh", md: "50vh", lg: "100%" }} 
        id="map" 
        ref={mapRef} 
        bg="gray.100" 
      />

      {/* 오른쪽: 목록 및 탭 영역 */}
      <Box 
        w={{ base: "100%", md: "100%", lg: "450px" }} 
        h={{ base: "50vh", md: "50vh", lg: "100%" }} 
        overflowY="auto" 
        p={5} 
        bg="white" 
        borderLeft={{ base: "none", lg: "1px solid #eee" }} 
        borderTop={{ base: "1px solid #eee", lg: "none" }}
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md">추천 코스</Heading>
          <Button 
            size="sm" 
            colorPalette="gray"
            variant="outline"
            // [핵심] 편집 페이지로 이동 시 fileId 전달 (검증 통과용)
            onClick={() => navigate({ to: "/edit", search: { fileId } })}
          >
            조건 변경 / 다시 추천
          </Button>
        </Flex>

        {/* Chakra UI v3 Tabs */}
        <Tabs.Root 
          value={tabValue} 
          onValueChange={handleTabChange} 
          colorPalette="teal" 
          variant="subtle"
        >
          <Tabs.List mb={4}>
            {resultData?.routes.map((route: any) => (
              <Tabs.Trigger key={route.course_id} value={String(route.course_id)}>
                {route.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {resultData?.routes.map((route: any) => (
            <Tabs.Content key={route.course_id} value={String(route.course_id)} p={0}>
              <VStack gap={3} align="stretch">
                {route.places.map((place: any, idx: number) => (
                  <Box key={idx} p={4} border="1px solid" borderColor="gray.200" borderRadius="lg" _hover={{ bg: "teal.50", borderColor: "teal.500" }} cursor="pointer">
                    <Flex gap={3}>
                      <Box minW="24px" h="24px" bg="teal.500" color="white" borderRadius="full" textAlign="center" fontWeight="bold" fontSize="sm" lineHeight="24px">
                        {idx + 1}
                      </Box>
                      <Box>
                        <Text fontWeight="bold" fontSize="lg">{place.name}</Text>
                        <Text fontSize="sm" color="gray.600">{place.category}</Text>
                        <Text fontSize="xs" color="gray.500" mt={1}>{place.address}</Text>
                        {place.link && (
                          <Link 
                            href={place.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            color="teal.600" 
                            fontSize="sm" 
                            mt={2} 
                            display="inline-block"
                          >
                            상세보기 &rarr;
                          </Link>
                        )}
                      </Box>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </Box>
    </Flex>
  )
}