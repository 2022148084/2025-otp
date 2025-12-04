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
  HStack,
  Icon,
  IconButton,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { FiThumbsUp, FiThumbsDown, FiX, FiPlus } from "react-icons/fi"

// 상대 경로 깊이 수정 (필요시 프로젝트 구조에 맞게 조정하세요)
import { useAnalysisStore } from "../../store/analysisStore"
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

  // 초기 로드 시 데이터가 없으면 course를 빈 배열로 설정하여 에러 방지
  const [courses, setCourses] = useState<any[]>(analysisData?.courses || [])

  // 페르소나의 선호/비선호 목록 관리
  const [personas, setPersonas] = useState<any[]>(analysisData?.personas || [])

  // 새 항목 입력 상태 (각 페르소나별, 선호/비선호별)
  const [newLikeInput, setNewLikeInput] = useState<Record<number, string>>({})
  const [newDislikeInput, setNewDislikeInput] = useState<Record<number, string>>({})

  // 입력창 표시 여부
  const [showLikeInput, setShowLikeInput] = useState<Record<number, boolean>>({})
  const [showDislikeInput, setShowDislikeInput] = useState<Record<number, boolean>>({})

  // 데이터 없으면(새로고침 등) 다시 업로드 페이지로 튕겨내기
  useEffect(() => {
    if (!analysisData) {
      alert("분석 데이터가 초기화되었습니다. 다시 업로드해주세요.")
      navigate({ to: "/recommendations" })
    } else {
        // analysisData가 있으면 courses 상태 업데이트 (혹시 초기화 시점이 늦을 경우 대비)
        setCourses(analysisData.courses)
        setPersonas(analysisData.personas)
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

  // 선호 항목 추가
  const handleAddLike = (personaIndex: number) => {
    const value = newLikeInput[personaIndex]?.trim()
    if (!value) return

    const newPersonas = [...personas]
    if (!newPersonas[personaIndex].likes) {
      newPersonas[personaIndex].likes = []
    }
    newPersonas[personaIndex].likes.push(value)
    setPersonas(newPersonas)
    setNewLikeInput({ ...newLikeInput, [personaIndex]: "" })
    setShowLikeInput({ ...showLikeInput, [personaIndex]: false })
  }

  // 비선호 항목 추가
  const handleAddDislike = (personaIndex: number) => {
    const value = newDislikeInput[personaIndex]?.trim()
    if (!value) return

    const newPersonas = [...personas]
    if (!newPersonas[personaIndex].dislikes) {
      newPersonas[personaIndex].dislikes = []
    }
    newPersonas[personaIndex].dislikes.push(value)
    setPersonas(newPersonas)
    setNewDislikeInput({ ...newDislikeInput, [personaIndex]: "" })
    setShowDislikeInput({ ...showDislikeInput, [personaIndex]: false })
  }

  // 선호 항목 삭제
  const handleRemoveLike = (personaIndex: number, likeIndex: number) => {
    const newPersonas = [...personas]
    newPersonas[personaIndex].likes.splice(likeIndex, 1)
    setPersonas(newPersonas)
  }

  // 비선호 항목 삭제
  const handleRemoveDislike = (personaIndex: number, dislikeIndex: number) => {
    const newPersonas = [...personas]
    newPersonas[personaIndex].dislikes.splice(dislikeIndex, 1)
    setPersonas(newPersonas)
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

        {/* [1] 여행 개요 (Metadata) 표시 */}
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

        {/* [2] 페르소나 영역 (수정된 UI: 선호/비선호 태그) */}
        <Box p={6} border="1px solid" borderColor="gray.200" borderRadius="xl" bg="gray.50">
          <Heading size="md" mb={4}>페르소나 분석</Heading>
          <VStack gap={4} align="stretch">
            {personas.map((p: any, idx: number) => (
              <Box key={idx} bg="white" p={5} borderRadius="md" boxShadow="sm">
                {/* 이름 */}
                <Flex gap={3} align="center" mb={3}>
                  <Badge colorPalette="purple" variant="solid" fontSize="1em" px={3} py={1} borderRadius="full">
                    {p.name}
                  </Badge>
                </Flex>

                {/* 선호 / 비선호 목록 */}
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    {/* 선호 */}
                    <Box>
                        <HStack mb={2}>
                            <Icon as={FiThumbsUp} color="green.500" />
                            <Text fontWeight="bold" fontSize="sm" color="green.600">선호</Text>
                        </HStack>
                        <VStack gap={2} align="stretch">
                          <Flex gap={2} flexWrap="wrap" alignItems="center">
                            {p.likes?.map((like: string, i: number) => (
                                <Badge
                                  key={i}
                                  colorPalette="green"
                                  variant="subtle"
                                  display="flex"
                                  alignItems="center"
                                  gap={0.5}
                                  pr={0.5}
                                  boxShadow="sm"
                                  transition="all 0.2s"
                                  _hover={{
                                    transform: "translateY(-2px)",
                                    boxShadow: "md",
                                    bg: "green.100"
                                  }}
                                >
                                    {like}
                                    <IconButton
                                      aria-label="삭제"
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => handleRemoveLike(idx, i)}
                                      _hover={{ bg: "transparent" }}
                                    >
                                      <FiX />
                                    </IconButton>
                                </Badge>
                            ))}
                            <IconButton
                              aria-label="추가"
                              size="xs"
                              variant="outline"
                              colorPalette="green"
                              onClick={() => setShowLikeInput({ ...showLikeInput, [idx]: true })}
                              transition="all 0.2s"
                              _hover={{
                                transform: "scale(1.1)",
                                bg: "green.50"
                              }}
                              _active={{
                                transform: "scale(0.95)"
                              }}
                            >
                              <FiPlus />
                            </IconButton>
                          </Flex>
                          {showLikeInput[idx] && (
                            <HStack
                              animation="fadeIn 0.3s ease-in-out"
                              css={{
                                '@keyframes fadeIn': {
                                  from: { opacity: 0, transform: 'translateY(-10px)' },
                                  to: { opacity: 1, transform: 'translateY(0)' }
                                }
                              }}
                            >
                              <Input
                                size="sm"
                                placeholder="선호 항목 추가..."
                                value={newLikeInput[idx] || ""}
                                onChange={(e) => setNewLikeInput({ ...newLikeInput, [idx]: e.target.value })}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleAddLike(idx)
                                  }
                                }}
                                autoFocus
                                transition="all 0.2s"
                                _focus={{
                                  borderColor: "green.400",
                                  boxShadow: "0 0 0 1px var(--chakra-colors-green-400)"
                                }}
                              />
                              <IconButton
                                aria-label="추가"
                                size="sm"
                                colorPalette="green"
                                onClick={() => handleAddLike(idx)}
                                transition="all 0.2s"
                                _hover={{
                                  transform: "scale(1.05)"
                                }}
                                _active={{
                                  transform: "scale(0.95)"
                                }}
                              >
                                <FiPlus />
                              </IconButton>
                              <IconButton
                                aria-label="취소"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowLikeInput({ ...showLikeInput, [idx]: false })
                                  setNewLikeInput({ ...newLikeInput, [idx]: "" })
                                }}
                                transition="all 0.2s"
                                _hover={{
                                  bg: "gray.100",
                                  transform: "scale(1.05)"
                                }}
                              >
                                <FiX />
                              </IconButton>
                            </HStack>
                          )}
                        </VStack>
                    </Box>

                    {/* 비선호 */}
                    <Box>
                        <HStack mb={2}>
                            <Icon as={FiThumbsDown} color="red.500" />
                            <Text fontWeight="bold" fontSize="sm" color="red.600">비선호</Text>
                        </HStack>
                        <VStack gap={2} align="stretch">
                          <Flex gap={2} flexWrap="wrap" alignItems="center">
                            {p.dislikes?.map((dislike: string, i: number) => (
                                <Badge
                                  key={i}
                                  colorPalette="red"
                                  variant="subtle"
                                  display="flex"
                                  alignItems="center"
                                  gap={0.5}
                                  pr={0.5}
                                  boxShadow="sm"
                                  transition="all 0.2s"
                                  _hover={{
                                    transform: "translateY(-2px)",
                                    boxShadow: "md",
                                    bg: "red.100"
                                  }}
                                >
                                    {dislike}
                                    <IconButton
                                      aria-label="삭제"
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => handleRemoveDislike(idx, i)}
                                      _hover={{ bg: "transparent" }}
                                    >
                                      <FiX />
                                    </IconButton>
                                </Badge>
                            ))}
                            <IconButton
                              aria-label="추가"
                              size="xs"
                              variant="outline"
                              colorPalette="red"
                              onClick={() => setShowDislikeInput({ ...showDislikeInput, [idx]: true })}
                              transition="all 0.2s"
                              _hover={{
                                transform: "scale(1.1)",
                                bg: "red.50"
                              }}
                              _active={{
                                transform: "scale(0.95)"
                              }}
                            >
                              <FiPlus />
                            </IconButton>
                          </Flex>
                          {showDislikeInput[idx] && (
                            <HStack
                              animation="fadeIn 0.3s ease-in-out"
                              css={{
                                '@keyframes fadeIn': {
                                  from: { opacity: 0, transform: 'translateY(-10px)' },
                                  to: { opacity: 1, transform: 'translateY(0)' }
                                }
                              }}
                            >
                              <Input
                                size="sm"
                                placeholder="비선호 항목 추가..."
                                value={newDislikeInput[idx] || ""}
                                onChange={(e) => setNewDislikeInput({ ...newDislikeInput, [idx]: e.target.value })}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleAddDislike(idx)
                                  }
                                }}
                                autoFocus
                                transition="all 0.2s"
                                _focus={{
                                  borderColor: "red.400",
                                  boxShadow: "0 0 0 1px var(--chakra-colors-red-400)"
                                }}
                              />
                              <IconButton
                                aria-label="추가"
                                size="sm"
                                colorPalette="red"
                                onClick={() => handleAddDislike(idx)}
                                transition="all 0.2s"
                                _hover={{
                                  transform: "scale(1.05)"
                                }}
                                _active={{
                                  transform: "scale(0.95)"
                                }}
                              >
                                <FiPlus />
                              </IconButton>
                              <IconButton
                                aria-label="취소"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowDislikeInput({ ...showDislikeInput, [idx]: false })
                                  setNewDislikeInput({ ...newDislikeInput, [idx]: "" })
                                }}
                                transition="all 0.2s"
                                _hover={{
                                  bg: "gray.100",
                                  transform: "scale(1.05)"
                                }}
                              >
                                <FiX />
                              </IconButton>
                            </HStack>
                          )}
                        </VStack>
                    </Box>
                </SimpleGrid>
              </Box>
            ))}
          </VStack>
        </Box>

        <Separator />

        {/* [3] 코스 키워드 수정 영역 */}
        <Box>
          <Heading size="md" mb={4}>✏️ 키워드 수정</Heading>
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
              </Box>
            ))}
          </VStack>
        </Box>

        {/* [4] 재검색 버튼 */}
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
          _hover={{ transform: "translateY(-2px)", boxShadow: "xl" }}
        >
          다시 추천받기 🔄
        </Button>

      </VStack>
    </Container>
  )
}