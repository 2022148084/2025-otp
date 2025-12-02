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
  
  // Zustand Store
  const { 
    setAnalysisData, 
    resultData: storedResultData, 
    setResultData: storeResultData 
  } = useAnalysisStore()
  
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null) // 지도 인스턴스 저장용
  const markersRef = useRef<any[]>([]) // 마커 배열 저장용
  const polylineRef = useRef<any>(null) // 경로선 저장용

  const [resultData, setResultData] = useState<any>(storedResultData || null)
  const [tabValue, setTabValue] = useState("1")
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null) 

  const recommendMutation = useMutation({
    mutationFn: (fid: string) =>
      RecommendationsService.createRecommendation({
        requestBody: {
          file_id: fid, 
        },
      }),
    onSuccess: (data: any) => {
      setResultData(data)
      storeResultData(data)
      if (data.analysis) setAnalysisData(data.analysis)

      if (data.routes && data.routes.length > 0) {
        setTimeout(() => initMap(data.routes[0].places), 100) 
      }
    },
  })

  useEffect(() => {
    if (fileId && !storedResultData) {
      recommendMutation.mutate(fileId)
    } else if (storedResultData?.routes?.length > 0) {
      const currentIndex = parseInt(tabValue) - 1
      setTimeout(() => initMap(storedResultData.routes[currentIndex].places), 100)
    }
  }, [fileId])

  const handleTabChange = (details: { value: string }) => {
    const newValue = details.value
    setTabValue(newValue)
    setSelectedIdx(null)
    
    const index = parseInt(newValue) - 1
    if (resultData?.routes[index]) {
      initMap(resultData.routes[index].places)
    }
  }

  // 리스트 클릭 시 지도를 해당 위치로 이동
  const handlePlaceClick = (lat: number, lng: number, index: number) => {
    setSelectedIdx(index)
    if (mapInstance.current && window.naver) {
      const moveLatLon = new window.naver.maps.LatLng(lat, lng)
      mapInstance.current.panTo(moveLatLon) 
    }
  }

  // [핵심] 지도 초기화 함수
  const initMap = (places: any[]) => {
    if (!window.naver || !mapRef.current) return

    // 0. 기존 마커/경로선 제거
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    // 1. 지도 생성 or 재사용
    let map = mapInstance.current
    if (!map) {
      map = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(37.5665, 126.9780),
        zoom: 14,
      })
      mapInstance.current = map
    }

    const bounds = new window.naver.maps.LatLngBounds()
    const path: any[] = []

    places.forEach((place, index) => {
      const latLng = new window.naver.maps.LatLng(place.lat, place.lng)
      path.push(latLng)
      bounds.extend(latLng) // 영역 확장

      // 2. 마커 생성
      const marker = new window.naver.maps.Marker({
        position: latLng,
        map: map,
        title: place.name,
        icon: {
          content: `<div style="background:#319795; color:white; width:24px; height:24px;
                    border-radius:50%; text-align:center; line-height:24px; font-weight:bold;
                    border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);">
                    ${index + 1}</div>`,
          anchor: new window.naver.maps.Point(12, 12), // 중심점 보정
        },
      })

      markersRef.current.push(marker)

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, "click", () => {
        setSelectedIdx(index)
        map.panTo(latLng)
      })
    })

    // 3. 경로선 그리기
    if (path.length > 1) {
      polylineRef.current = new window.naver.maps.Polyline({
        map: map,
        path: path,
        strokeColor: "#319795",
        strokeWeight: 5,
        strokeOpacity: 0.7,
      })
    }

    // 4. 지도 크기 재계산 후 fitBounds 실행
    if (places.length > 0) {
      window.naver.maps.Event.trigger(map, "resize")
      setTimeout(() => {
        map.fitBounds(bounds, {
          top: 80,
          right: 80,
          bottom: 80,
          left: 80
        })
      }, 50)
    }
  }

  if (recommendMutation.isPending) {
    return (
      <Container centerContent py={20}>
        <Spinner size="xl" color="teal.500" borderWidth="4px" />
        <Text mt={4} fontSize="lg">AI가 최적의 경로를 3가지로 분석 중입니다...</Text>
        <Text fontSize="sm" color="gray.500">(약 5~10초 소요)</Text>
      </Container>
    )
  }

  if (recommendMutation.isError) {
    return (
      <Container py={20}>
        <Text color="red.500">분석 중 오류 발생: {recommendMutation.error?.message}</Text>
      </Container>
    )
  }

  return (
    <Flex direction={{ base: "column", md: "column", lg: "row" }} h="calc(100vh - 64px)">
      {/* 지도 영역 */}
      <Box flex="1" h={{ base: "50vh", md: "50vh", lg: "100%" }} id="map" ref={mapRef} bg="gray.100" />

      {/* 목록 영역 */}
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
            onClick={() => navigate({ to: "/edit", search: { fileId } })}
          >
            조건 변경 / 다시 추천
          </Button>
        </Flex>

        <Tabs.Root value={tabValue} onValueChange={handleTabChange} colorPalette="teal" variant="subtle">
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
                  <Box 
                    key={idx} 
                    p={4} 
                    border="1px solid" 
                    borderColor={selectedIdx === idx ? "teal.500" : "gray.200"} 
                    bg={selectedIdx === idx ? "teal.50" : "white"}
                    borderRadius="lg" 
                    _hover={{ bg: "teal.50", borderColor: "teal.500" }} 
                    cursor="pointer"
                    onClick={() => handlePlaceClick(place.lat, place.lng, idx)}
                  >
                    <Flex gap={3}>
                      <Box minW="24px" h="24px" bg={selectedIdx === idx ? "teal.600" : "teal.500"} color="white" borderRadius="full" textAlign="center" fontWeight="bold" fontSize="sm" lineHeight="24px">
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
                            onClick={(e) => e.stopPropagation()} 
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