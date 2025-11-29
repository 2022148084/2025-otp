import { createFileRoute } from "@tanstack/react-router"
import {
  Box,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
  Badge,
  Link,
} from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { RecommendationsService } from "../../client"

declare global {
  interface Window {
    naver: any
  }
}

export const Route = createFileRoute("/_layout/result")({
  component: Result,
  validateSearch: (search: Record<string, unknown>) => ({
    fileId: search.fileId as string,
  }),
})

function Result() {
  const { fileId } = Route.useSearch()
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapResult, setMapResult] = useState<any>(null)

  const recommendMutation = useMutation({
    mutationFn: (fid: string) =>
      RecommendationsService.createRecommendation({
        fileId: fid, 
      }),
    onSuccess: (data: any) => {
      setMapResult(data)
      setTimeout(() => initMap(data.places), 100) 
    },
  })

  useEffect(() => {
    if (fileId) {
      recommendMutation.mutate(fileId)
    }
  }, [fileId])

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

  // 1. 로딩
  if (recommendMutation.isPending) {
    return (
      <Container centerContent py={20}>
        <Spinner size="xl" color="teal.500" borderWidth="4px" />
        <Text mt={4} fontSize="lg">AI가 최적의 경로를 분석하고 있습니다...</Text>
        <Text fontSize="sm" color="gray.500">(약 5~10초 소요)</Text>
      </Container>
    )
  }

  // 2. 에러
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

  // 3. 결과
  return (
    // [반응형 수정] md(태블릿) 구간에서도 column(세로) 배치를 유지합니다.
    // base: 모바일 (세로) / md: 태블릿 (세로) / lg: 데스크톱 (가로)
    <Flex direction={{ base: "column", md: "column", lg: "row" }} h="calc(100vh - 64px)">
      
      {/* 지도 영역 */}
      <Box 
        flex="1" 
        // [반응형 수정] 태블릿(md)까지는 화면 높이의 50%만 차지하게 함
        h={{ base: "50vh", md: "50vh", lg: "100%" }} 
        id="map" 
        ref={mapRef} 
        bg="gray.100" 
      />

      {/* 목록 영역 */}
      <Box 
        // [반응형 수정] 태블릿(md)까지는 너비 100%, 데스크톱(lg)에서만 고정 400px
        w={{ base: "100%", md: "100%", lg: "400px" }} 
        h={{ base: "50vh", md: "50vh", lg: "100%" }} 
        overflowY="auto" 
        p={5} 
        bg="white" 
        // [반응형 수정] 테두리 위치 조정
        borderLeft={{ base: "none", lg: "1px solid #eee" }} 
        borderTop={{ base: "1px solid #eee", lg: "none" }}
      >
        <Heading size="md" mb={4}>{mapResult?.title}</Heading>
        
        <Flex gap={2} mb={6} flexWrap="wrap">
          {mapResult?.keywords.map((k: string) => (
            <Badge key={k} colorScheme="purple">{k}</Badge>
          ))}
        </Flex>

        <VStack gap={3} align="stretch">
          {mapResult?.places.map((place: any, index: number) => (
            <Box key={index} p={4} border="1px solid" borderColor="gray.200" borderRadius="lg" _hover={{ bg: "teal.50", borderColor: "teal.500" }} cursor="pointer">
              <Flex gap={3}>
                <Box minW="24px" h="24px" bg="teal.500" color="white" borderRadius="full" textAlign="center" fontWeight="bold" fontSize="sm" lineHeight="24px">
                  {index + 1}
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
      </Box>
    </Flex>
  )
}