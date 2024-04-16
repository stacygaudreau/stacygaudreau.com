---
title: "Low Latency C++ for HFT - Part 2 - Building Blocks"
description: "Building some core modules needed for low-latency systems programming"
categories: ['Programming', 'C++']
tags: ['C++', 'Low Latency', 'HFT', 'Finance', 'Multithreading']
type: 'blog'
date: 2024-03-22T12:09:58-04:00
draft: true
---

## What we're building

The objective is to build some of the fundamental modules we'll need for low-latency systems programming. In this part, we'll begin putting together a utility library which provides --

1. Core-pinned **multithreading**
2. A **memory pool** (avoiding dynamic allocations)
3. **Lock-free queues** (for fast, thread-safe communication)
4. **Logging** framework (low latency)

I'll continue to add and improve library functionality in later parts of this series.

## Principles & tools employed

I'm learning as I go, basing my components off the author's implementations (if you missed [Part 1, check it out here](https://stacygaudreau.com/blog/cpp/low-latency-cpp-for-hft-part1/), where this is all explained). 

### Reference Book
> The contents of this part are based on **Chapter 4** of Sourav Ghosh's book **[_Building Low Latency Applications with C++_](https://www.packtpub.com/product/building-low-latency-applications-with-c/9781837639359)**, which I highly recommend to check out if you're interested in learning more.

### Source code

To keep things (relatively) orderly, I'm not copying 100% of the source, here. The entire [GitHub repository can be found at this link.](https://github.com/stacygaudreau/nitek)

\ Note regarding source code
> All of the code shared is written by myself while learning from, experimenting with and extending the code found in Ghosh's text. You will find that my code is based heavily on the book. You can find the [author's repository for the book here](https://github.com/PacktPublishing/Building-Low-Latency-Applications-with-CPP).
> 
> If you are following, do note that there are some differences between the published book's source and that in the repository, and it's been interesting to piece together the changes and thought process throughout.

### Unit testing

The author does not write unit tests, but I will be using [Google Test](https://github.com/google/googletest) throughout my implementation. 

\ Catch2 vs Google Test
> Initially I was going to use Catch2 since it is less verbose, but it doesn't allow testing for expected exit failures/assertions. 
>
> This may not be a problem for many projects, but we will be relying on assertions in our development code within critical paths, since runtime exceptions can indeed have overhead at runtime. In these critical areas we'll use `noexcept`, and so if we still want to code defensively, assertions are a good way to do that without slowing down critical paths.

### Environment and tools

This project will effectively be a **Linux server application** in the end, so really, only Linux operating systems are supported. My development kernel is Ubuntu Linux `6.5.0` but lower versions will probably work. 

The most important thing is that you're compiling with the `C++20` standard on a system with the appropriate POSIX system interface headers (eg: `<unistd.h>`).

For reference, here are my dev system/tool versions at the time of writing.

- Ubuntu Linux `6.5.0` x86_64 GNU/Linux
- CMake `3.27`
- Ninja build system `1.11.1` 
- JetBrains CLion `2023.3.3`
- `g++` (Ubuntu 11.4.0-1ubuntu1~22.04) `11.4.0`

## Multithreading

The first module we'll build are some helpers for multithreading. This implementation wraps `std::thread`, giving us a convenient interface to spawn worker threads with. Each worker thread can be **pinned to the core** it is instantiated on, which prevents context switching from the thread moving to a different CPU core. 

The interface allows us to pass an arbitrary function and corresponding arguments, which the thread will work on. 

My code comments should be pretty explanatory, if not a little bit verbose.

\ create_and_start_thread()
```c++
/**
 * @brief Create and start a POSIX thread, pinning to the specified core_id
 * @tparam T Type of callable object for the thread to work on
 * @tparam A Variadic parameter pack for the callable T
 * @param core_id Core ID to pin the thread to
 * @param name String identifier for the thread
 * @param fn The callable object for the thread to work on
 * @param args Zero or more arguments passed to the callable fn
 * @return The created thread, or nullptr if thread creation failed
 */
template<typename T, typename... A>
inline auto create_and_start_thread(int core_id, const std::string& name, T&& fn, A&& ...args)
noexcept {
    std::atomic<bool> running{ false }, failed{ false };

    // lambda of thread body, passed to ctor such that any kind of fn and arbitrary
    //  arguments/types can be passed to std::thread
    auto thread_body = [&] {
        // fail if the thread cannot be pinned to the specified core_id
        if (core_id >= 0 && !pin_thread_to_core(core_id)) {
            std::cerr << "Failed to set core affinity for " << name << " " << pthread_self() <<
                      " to " << core_id << "\n";
            failed = true;
            return;
        }
        std::cout << "Setting core affinity for " << name << " " << pthread_self() << " to " <<
                  core_id << "\n";
        running = true;
        // perfect forwarding is used to pass fn's variadic l/rvalues
        std::forward<T>(fn)((std::forward<A>(args))...);
    };

    // instantiate thread, waiting for it to start or fail
    auto t = std::make_unique<std::thread>(thread_body);
    while (!(running || failed)) {
        using namespace std::literals::chrono_literals;
        std::this_thread::sleep_for(50ms);
    }
    if (failed) {
        t->join();
        t = nullptr;
    }
    return t;
}
```

### Pinning a thread to a specific core

Here we use the POSIX interface `pthread_setaffinity_np` to lock the thread to a specific core ID. We do this by setting the **affinity** to be a single, specific core. 

\ The `cpu_set_t` type
> This type deserves some attention if you've not worked with it before. 
> 
> A `cpu_set` is simply a set of bits that are used to select zero or more CPUs from an available range. We then use these bits to "mask" another set of bits (often a low level settings register or something like it). This is known as a **[bitmask](https://en.wikipedia.org/wiki/Mask_(computing))**, which will likely be no stranger to you if you've spent any time doing baremetal programming of embedded or other low-level devices before.
>
> The `CPU_ZERO` and `CPU_SET` functions are helpers which zero out the bits in the mask, and carry out the bit-setting on the mask you've created, respectively. These mean you don't have to manually perform bitwise arithmetic. 

\ pin_thread_to_core()
```c++
/**
 * @brief Pin the current thread to a specific core_id
 * @param core_id Core ID to pin the thread to
 * @return false if pinning core affinity fails
 */
inline auto pin_thread_to_core(int core_id) noexcept {
    // we are setting the allowed **set** of CPU cores a thread can run on
    cpu_set_t cpu_set;  // bitmask rep'n of a set of CPUs
    CPU_ZERO(&cpu_set); // zeros the mask
    CPU_SET(core_id, &cpu_set); // using bitwise operations, set *single* core for the thread
    return (pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &cpu_set) == 0);
}
```

## Memory pool

In terms of latency at runtime, dynamic memory allocations are **very** expensive. In order to dynamically allocate objects at runtime (which is often a requirement), we're building a pool of pre-allocated memory we can manually allocate and deallocate objects from.

### Approach

A simple range of pre-allocated, contiguous memory is reserved sometime during program startup or execution when it won't impact performance. We then use this range of memory to manually allocate from, and deallocate objects of some type we've defined, in our applications.

### Underlying storage selection

The choice to use heap (eg: `std::vector`) or stack memory (`std::array` or a naked C-style array) comes down to a matter of application specifics. For example, the stack might perform better if the objects we're storing in each block are small or few in number, and won't be accessed very often (thereby getting better cache performance). If the blocks are numerous and large, heap allocation probably makes the most sense.

In this implementation we use heap memory (`std::vector`) but it's a good idea to profile and decide for the given application.

### Performance

The main benefit for low latency performance is avoiding the runtime penalty of dynamic memory allocation (`new`, `std::make_unique`, etc). In this implementation, our `.allocate()` routine searches for the next available block with the `.update_next_free_index()`. 

This has a worst case _linear_ runtime of `O(n)` where `n` is the size of the memory pool, but for practical purposes the pool will very often find a free block before scanning through the entire underlying array-like container. Deallocation/freeing of memory is an `O(1)` operation.

Additionally, by pre-allocating the range of memory on the system, it means other applications which may be running will not pollute the range with activity (which may cause bus contention and fragmentation). Instead, we have a range of memory that we're in control of, and can therefore enjoy relatively deterministic access to.

### Code

Select parts of the `MemPool` class are described below. Again, you can find the [full source code here](https://github.com/stacygaudreau/nitek). The comments are pretty comprehensive so I will just point out a few areas of interest here.

#### Deletion of default constructors and operators

Removing the default copy/move constructors and assignment operators is a reasonable best practise that we will see repeated throughout the codebase. The intention is to avoid _unintended_ copies and moves, while being a bit more explicit with the compiler and potentially allowing for better optimisations. In most cases the optimisations will probably be negligible. Avoiding accidental copies/moves for an object which eg: manages the lifetime of other objects (like our `MemPool`!) is more about ensuring program correctness. 

We will use this pattern a lot, so we define a macro for it.

\ DELETE_DEFAULT_COPY_AND_MOVE()

```cpp
/**
 * @brief Delete default ctor and copy/move ctor and assignment
 * operators for a given classname
 */
#define DELETE_DEFAULT_COPY_AND_MOVE(ClassName) \
public: \
    ClassName() = delete; \
    ClassName(const ClassName&) = delete; \
    ClassName(const ClassName&&) = delete; \
    ClassName& operator=(const ClassName&) = delete; \
    ClassName& operator=(const ClassName&&) = delete;
```

#### Memory blocks

The low-level implementation of the memory pool is straight-forward. The pool stores a vector of `Block` to allocate from. Each `Block` stores the underlying object and has a flag to determine whether or not it is free.

\ MemPool::Block
```cpp
struct Block {
    T object; // the actual stored object
    bool is_free{ true }; // true when available for allocation
};
```

#### Allocation

The next available index `i_next_free` is stored and maintained each time allocation occurs. This is the slowest part of the pool's operations and yet it is still an improvement over native dynamic memory allocation on the heap.


\ MemPool::allocate()
```cpp
/**
* @brief Allocate a new memory block for object of type T
* @tparam Args Variadic template arguments for T's constructor
* @param args Zero or more arguments, passed to T's constructor
* @return New object of type T, or nullptr if unsuccessful
*/
template<typename ...Args>
T* allocate(Args... args) noexcept {
    auto block = &(blocks[i_next_free]);
    ASSERT(block->is_free, "<MemPool> object block at index " +
            std::to_string(i_next_free) + " is not free");
    T* object = &(block->object);
    // use a specific memory block to allocate via new()
    object = new(object) T(args...);  
    block->is_free = false;
    update_next_free_index();
    return object;
}
```

The below subroutine finds the index of the next free `Block` in the pool. It can be profiled and optimised to best suit the target build.

\ MemPool::update_next_free_index()

```cpp
/**
* @brief Update the index to the next available block
* @details The best performing implementation method of this function depends on the
* application. One should measure the performance in practice and see which works
* best.
*/
auto update_next_free_index() noexcept {
    const auto i = i_next_free;
    while (!blocks[i_next_free].is_free) {
        ++i_next_free;
        if (i_next_free == blocks.size()) [[unlikely]] {
            // the hardware branch predictor should always predict this not taken
            // however, a different method would be to have two while loops: one until
            // i_next_free == blocks.size(), and the other from 0 onward. this would
            // negate the need for this branch entirely
            i_next_free = 0;
        }
        if (i == i_next_free) [[unlikely]] {
            // there are better methods to handle this in production
            ASSERT(i != i_next_free, "<MemPool> memory pool overrun");
        }
    }
}
```

#### Deallocation

To free up a `Block` in the pool, we call `deallocate()` which simply sets the block's `is_free` flag to false. It is up to the programmer to ensure that they continue to treat the object as destroyed.

```cpp
/**
* @brief Deallocate/free a given object's block from the memory pool
* @param object Object to deallocate
*/
auto deallocate(const T* object) noexcept {
    const auto i_object = reinterpret_cast<const Block*>(object) - &blocks[0];
    ASSERT(i_object >= 0 && static_cast<size_t>(i_object) < blocks.size(),
            "<MemPool> object being deallocated does not belong to this pool");
    ASSERT(!blocks[i_object].is_free,
            "<MemPool> attempting to free a pool object which is NOT in use at index "
                    + std::to_string(i_object));
    blocks[i_object].is_free = true;
}
```

#### Putting it all together

The methods we've discussed fit together with the rest of the memory pool class --

\ MemPool

```cpp
/**
 * @brief A low-latency memory pool for storing dynamically allocated objects on the heap
 * @tparam T Type of object to store in the pool
 * @details The memory pool should be created *before* the execution of any critical paths. 
 * This is because the contained vector being resized is the only time when dynamic memory
 * allocation occurs.
 */
template<typename T>
class MemPool final {
public:
    /**
     * @brief Construct a low latency memory pool for n_blocks of type T.
     * @param n_blocks (max) number of blocks the pool can store
     */
    explicit MemPool(std::size_t n_blocks) : blocks(n_blocks, { T{ }, true }) {
        // ensure that the first block in the pool is the correct type; we use 
        // reinterpret_cast in .deallocate() - for performance reasons - thus, 
        // we ensure cast safety here instead.
        ASSERT(reinterpret_cast<const Block*>(&(blocks[0].object)) == &(blocks[0]),
               "<MemPool> stored object must be first member of Block");
    }

    // allocate()

    // deallocate()

    // delete default, copy/move ctors as well as copy/move assignment op's.
    // this avoids unintended copy/move construction, as well as copy/move assignment
    DELETE_DEFAULT_COPY_AND_MOVE(MemPool)

private:
    // update_next_free_index()

    struct Block {
        T object; // the actual stored object
        bool is_free{ true }; // true when available for allocation
    };

    std::vector<Block> blocks;
    size_t i_next_free{ 0 };
};
```

## Lock-free queues

As mentioned before, context switching degrades application latency when multithreading. Locks, mutexes and semaphores are common approaches to controlling access to threads and facilitating data transfer between them, but they come with runtime overhead which can seriously affect latency.

For these reasons, the next data structure we're building is a simple SPSC (Single Producer, Single Consumer) queue to provide a queue mechanism for sharing data between threads, without having to use locks.

### Approach

Similar to the `MemPool`, we have the option of heap or stack allocation for underlying storage. Here, we again choose heap memory in the form of a `std::vector`.

There are few differences between this queue and any generic implementation you might find an example of. The important thing to note is that this queue is thread-aware.

We use [std::atomic](https://en.cppreference.com/w/cpp/atomic/atomic) to provide thread-safe atomic access to the counters/indices which govern the queue, since we know there will be up to two threads concurrently trying to modify these members. This is a simple strategy to avoid race conditions on members shared between threads, and provides the "lock free" in this queue since it does not rely on mutexes or locks.

One other thing to note is that a write consists of two method calls: once to `get_next_to_write()` which returns a pointer to the next object for writing, and a second call to `increment_write_index()`. These processes could be lumped together but instead are separated to allow the programmer more fine control and the opportunity for performance gains. For example, performance is improved when writing larger objects, and only part of the object needs updating or overwriting.

### Code

The comments and implementation are pretty self explanatory if you've seen a queue before, so we'll not dive into much more detail about the code. You can find it in the [GitHub repository](https://github.com/stacygaudreau/nitek).

## Logging

Logging is an important part of most software and unfortunately writing to a logfile on disk can be a very slow process compared to the latencies we're looking for in performant applications.

For this reason we will put our `LFQueue` to work, and create a `Logger` module which streams log messages to disk in a background thread, separate from any critical paths. The exact speed our logs are written to disk doesn't matter to us, as long as it doesn't affect the performance of our critical code sections.

### Approach

A lock-free queue (developed earlier) is used to push the burden of writing log messages to disk onto a background thread. This moves the slow process of writing to disk and processing log messages away from any low latency application paths.

The interface used by critical paths to send log messages to the background logging thread is designed to be very fast and low latency in comparison, and only has to pass data on to the logging queue to process.

### Code

The entire module's code can be found at the [GitHub repository](https://github.com/stacygaudreau/nitek). Some of the more interesting parts are discussed here.

#### Logging method

Our high performance code paths need a quick way to send various log messages to the queue. The `logf()` method of this implementation does that with a `printf()`-like syntax, where `%` signs in the string are replaced by any arguments following the string. 

Other solutions exist which are potentially faster, but would likely sacrifice some of the versatility of this method. The template for this method is shown below.

\ logf()

```cpp
/**
 * @brief Log message to file, using printf-like syntax. Like printf(), each % symbol
 * in a string will be replaced by any number of corresponding arguments given.
 * @details Use %% to escape the % character.
 * @param s Logging message/string with % to replace by any arguments which follow.
 */
template<typename T, typename... A>
void logf(const char* s, const T& value, A... args) noexcept {
    while (*s) {
        if (*s == '%') {
            if (*(s + 1) == '%') [[unlikely]] { // allow %% to escape %
                ++s;
            }
            else {
                push_value(value);  // % is substituted with argument value
                logf(s + 1, args...);   // recursive call with next argument
                return;
            }
        }
        push_value(*s++);
    }
    FATAL("<Logger::logf()> too many arguments provided");
}
```

Member function `push_value()` is overloaded to handle each of the different supported variadic template argument types which can be passed as a `value` to `logf()`. Two examples are shown below and the rest are omitted since they are all similar. This method is called each time a `%` is encountered in the formatted string.

\ push_value()

```cpp
/**
 * @brief Enqueue a std::string to the logging queue.
 */
void push_value(const std::string& value) noexcept {
    push_value(value.c_str());
}
/**
 * @brief Enqueue a single value to the logging queue.
 */
void push_value(const int value) noexcept {
    push_element(LogElement{ LogType::INT, { .i = value }});
}
```

## Summary and next time

We've started building a library of core C++ components for building low-latency applications with. 

We wrapped the basic STL and POSIX threading utilities to provide core-pinned multithreading and avoid the latency induced by context switching. 

A heap-allocated memory pool was implemented in order to avoid the large overhead of dynamic runtime memory allocations. 

Finally, we developed a lock-free queue to use with our threading utilities, and put it to use in a low-latency logging module. The logging module provides `printf()`-like syntax for logging messages to disk, where we've offloaded the slow task of writing to disk to a separate, dedicated background thread.

### In the next part

In the next part 3 of this series, I'll be diving into Unix socket and network programming while adding TCP and UDP server/client functionality to the library.