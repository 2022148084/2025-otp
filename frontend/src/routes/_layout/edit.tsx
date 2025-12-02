import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  Input,
  Flex,
  Badge,
  Separator,
  SimpleGrid,
} from "@chakra-ui/react"
import { useAnalysisStore } from "../../store/analysisStore"
import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { RecommendationsService } from "../../client"

// URL 파라미터(fileId) 정의
export const Route = createFileRoute("/_layout/edit")({
  component: Edit,
  validateSearch: (search: Record<string, unknown>) => ({
    fileId: search.fileId as string,
  }),
})

function Edit() {
  const { fileId } = Route.useSearch()
  const navigate = useNavigate()

  const { analysisData, setAnalysisData, setResultData } = useAnalysisStore()
  const [courses, setCourses] = useState<any[]>(analysisData?.courses || [])

  useEffect(() => {
    if (!analysisData) {
      alert("분석 데이터가 초기화되었습니다. 다시 업로드해주세요.")
      navigate({ to: "/recommendations" })
    }
  }, [analysisData, navigate])

  const reRecommendMutation = useMutation({
    mutationFn: () =>
      RecommendationsService.createRecommendation({
        requestBody: {
          courses: courses,
          metadata: analysisData?.metadata,
          personas: analysisData?.personas,
        },
      }),
    onSuccess: (newData: any) => {
      setAnalysisData(newData.analysis)
      setResultData(newData) // resultData도 store에 저장
      navigate({ to: "/result", search: { fileId } })
    },
    onError: (err) => {
      alert("재검색 실패: " + err.message)
    }
  })

  const handleKeywordChange = (index: number, newValue: string) => {
    const newCourses = [...courses]
    newCourses[index].final_query = newValue
    setCourses(newCourses)
  }

  if (!analysisData) return null

  return (
    <Container maxW="container.md" py={12}>
      <VStack gap={8} align="stretch">
        
        <Box>
          <Heading size="xl" mb={2} color="teal.600">키워드 편집</Heading>
          <Text color="gray.500">
            AI가 분석한 내용을 수정하고 다시 추천받을 수 있습니다.
          </Text>
        </Box>

        {/* [추가] 1. 여행 개요 (Metadata) 표시 */}
        <Box p={5} border="1px solid" borderColor="teal.200" borderRadius="xl" bg="teal.50">
          <Heading size="sm" mb={3} color="teal.700">📅 여행 개요</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <Box>
              <Text fontSize="xs" color="gray.500">📍 위치</Text>
              <Text fontWeight="bold" fontSize="lg">{analysisData.metadata?.location}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">🗓️ 날짜</Text>
              <Text fontWeight="bold" fontSize="lg">{analysisData.metadata?.date}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">👥 인원</Text>
              <Text fontWeight="bold" fontSize="lg">{analysisData.metadata?.group_name}</Text>
            </Box>
          </SimpleGrid>
        </Box>

        <Separator />

        {/* 2. 페르소나 영역 (보기 전용) */}
        <Box p={6} border="1px solid" borderColor="gray.200" borderRadius="xl" bg="gray.50">
          <Heading size="md" mb={4}>🧠 페르소나 분석</Heading>
          <VStack gap={4} align="stretch">
            {analysisData.personas.map((p: any, idx: number) => (
              <Box key={idx} bg="white" p={4} borderRadius="md" boxShadow="sm">
                <Flex gap={3} align="center" mb={2}>
                  <Badge colorPalette="purple" variant="solid" fontSize="0.9em">
                    {p.name}
                  </Badge>
                </Flex>
                <Text fontSize="sm" color="gray.700">
                  {p.traits}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>

        <Separator />

        {/* 3. 코스 키워드 수정 영역 */}
        <Box>
          <Heading size="md" mb={4}>✏️ 검색어 수정</Heading>
          <VStack gap={5}>
            {courses.map((step: any, index: number) => (
              <Box key={index} w="100%">
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold" color="teal.600">
                    Step {step.step}. {step.category}
                  </Text>
                </Flex>
                <Input 
                  size="lg"
                  value={step.final_query}
                  onChange={(e) => handleKeywordChange(index, e.target.value)}
                  borderColor="gray.300"
                  _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                />
                <Text fontSize="xs" color="gray.400" mt={1}>
                  실제 네이버 지도 검색에 사용될 단어입니다.
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* 4. 재검색 버튼 */}
        <Button 
          colorPalette="teal" 
          colorScheme="teal"
          size="lg"
          height="55px"
          fontSize="lg"
          onClick={() => reRecommendMutation.mutate()}
          loading={reRecommendMutation.isPending}
          loadingText="새로운 경로 찾는 중..."
          boxShadow="lg"
        >
          이 키워드로 다시 추천받기 🔄
        </Button>

      </VStack>
    </Container>
  )
}